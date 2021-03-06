/*
 * Copyright (C) 2015 B3Partners B.V.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package nl.b3p.viewer.stripes;

import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.PrecisionModel;
import com.vividsolutions.jts.operation.overlay.snap.GeometrySnapper;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;
import net.sourceforge.stripes.action.ActionBean;
import net.sourceforge.stripes.action.ActionBeanContext;
import net.sourceforge.stripes.action.After;
import net.sourceforge.stripes.action.Before;
import net.sourceforge.stripes.action.Resolution;
import net.sourceforge.stripes.action.StreamingResolution;
import net.sourceforge.stripes.action.StrictBinding;
import net.sourceforge.stripes.action.UrlBinding;
import net.sourceforge.stripes.controller.LifecycleStage;
import net.sourceforge.stripes.validation.Validate;
import nl.b3p.viewer.config.app.Application;
import nl.b3p.viewer.config.app.ApplicationLayer;
import nl.b3p.viewer.config.security.Authorizations;
import nl.b3p.viewer.config.services.Layer;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.geotools.data.DataUtilities;
import org.geotools.data.DefaultTransaction;
import org.geotools.data.FeatureSource;
import org.geotools.data.Transaction;
import org.geotools.data.simple.SimpleFeatureStore;
import org.geotools.factory.CommonFactoryFinder;
import org.geotools.feature.FeatureCollection;
import org.geotools.filter.identity.FeatureIdImpl;
import org.geotools.geometry.jts.GeometryCollector;
import org.geotools.util.Converter;
import org.geotools.util.GeometryTypeConverterFactory;
import org.json.JSONException;
import org.json.JSONObject;
import org.opengis.feature.simple.SimpleFeature;
import org.opengis.feature.type.GeometryType;
import org.opengis.filter.Filter;
import org.opengis.filter.FilterFactory2;
import org.opengis.filter.identity.FeatureId;

/**
 * Merge two features, A and B so that A will have the combined geometry of A
 * and B and B will cease to exist. A may be a new feature if that strategy is
 * chosen.
 *
 * @author Mark Prins <mark@b3partners.nl>
 */
@UrlBinding("/action/feature/merge")
@StrictBinding
public class MergeFeaturesActionBean implements ActionBean {

    private static final Log log = LogFactory.getLog(MergeFeaturesActionBean.class);

    private static final String FID = FeatureInfoActionBean.FID;

    private ActionBeanContext context;

    @Validate
    private Application application;

    @Validate
    private ApplicationLayer appLayer;

    /**
     * Existing feature handling strategy. {@code replace} updates the existing
     * feature A with a new geometry and deletes feature B, {@code new} deletes
     * the existing features and creates a new feature.
     */
    @Validate
    private String strategy;

    @Validate
    private int mergeGapDist;

    @Validate
    private String fidA;
    @Validate
    private String fidB;

    private SimpleFeatureStore store;

    private Layer layer = null;

    private boolean unauthorized;

    @After(stages = LifecycleStage.BindingAndValidation)
    public void loadLayer() {
        this.layer = appLayer.getService().getSingleLayer(appLayer.getLayerName());
    }

    @Before(stages = LifecycleStage.EventHandling)
    public void checkAuthorization() {
        if (application == null || appLayer == null
                || !Authorizations.isAppLayerWriteAuthorized(application, appLayer, context.getRequest())) {
            unauthorized = true;
        }
    }

    public Resolution merge() throws JSONException {
        JSONObject json = new JSONObject();
        json.put("success", Boolean.FALSE);
        String error = null;

        if (appLayer == null) {
            error = "Invalid parameters";
        } else if (unauthorized) {
            error = "Not authorized";
        } else {
            FeatureSource fs = null;
            try {
                if (this.fidA == null || this.fidB == null) {
                    throw new IllegalArgumentException("Merge feature ID is null for A or B");
                }
                if (this.strategy == null) {
                    throw new IllegalArgumentException("Merge strategy is null");
                }

                fs = this.layer.getFeatureType().openGeoToolsFeatureSource();
                if (!(fs instanceof SimpleFeatureStore)) {
                    throw new IllegalArgumentException("Feature source does not support editing");
                }
                this.store = (SimpleFeatureStore) fs;

                List<FeatureId> ids = this.mergeFeatures();

                if (ids.isEmpty()) {
                    throw new IllegalArgumentException("Merge failed, check that geometries overlap");
                }

                if (ids.size() > 1) {
                    throw new IllegalArgumentException("Merge failed, more than one resulting geometries.");
                }

                json.put("fids", ids);
                json.put("success", Boolean.TRUE);
            } catch (IllegalArgumentException e) {
                log.warn("Merge error", e);
                error = e.getLocalizedMessage();
            } catch (Exception e) {
                log.error(String.format("Exception merging feature %s to %s", this.fidB, this.fidA), e);
                error = e.toString();
                if (e.getCause() != null) {
                    error += "; cause: " + e.getCause().toString();
                }
            } finally {
                if (fs != null) {
                    fs.getDataStore().dispose();
                }
            }
        }

        if (error != null) {
            json.put("error", error);
        }
        return new StreamingResolution("application/json", new StringReader(json.toString()));
    }

    /**
     * Get features from store and merge them.
     *
     * @return a list of feature ids that have been updated
     * @throws Exception when there is an error communication with the datastore
     * of when the arguments are invalid. In case of an exception the
     * transaction will be rolled back
     */
    private List<FeatureId> mergeFeatures() throws Exception {
        List<FeatureId> ids = new ArrayList();
        Transaction transaction = new DefaultTransaction("split");
        try {
            store.setTransaction(transaction);
            // get the feature to split from database using the FID
            FilterFactory2 ff = CommonFactoryFinder.getFilterFactory2();
            Filter filterA = ff.id(new FeatureIdImpl(this.fidA));
            Filter filterB = ff.id(new FeatureIdImpl(this.fidB));

            SimpleFeature fA = null;
            FeatureCollection fc = store.getFeatures(filterA);
            if (fc.features().hasNext()) {
                fA = (SimpleFeature) fc.features().next();
            } else {
                throw new IllegalArgumentException(
                        String.format("Feature A having ID: (%s) not found in datastore.", this.fidA));
            }

            SimpleFeature fB = null;
            fc = store.getFeatures(filterB);
            if (fc.features().hasNext()) {
                fB = (SimpleFeature) fc.features().next();
            } else {
                throw new IllegalArgumentException(
                        String.format("Feature B having ID: (%s) not found in datastore.", this.fidB));
            }

            String geomAttrName = store.getSchema().getGeometryDescriptor().getLocalName();
            Geometry geomA = (Geometry) fA.getProperty(geomAttrName).getValue();
            Geometry geomB = (Geometry) fB.getProperty(geomAttrName).getValue();

            log.debug("input geomA: " + geomA);
            log.debug("input geomB: " + geomB);

            Geometry newGeom = null;
            GeometryCollector geoms = new GeometryCollector();
            geoms.setFactory(new GeometryFactory(new PrecisionModel(), geomA.getSRID()));
            geoms.add(geomA);
            geoms.add(geomB);

            if (geomB.intersects(geomA)) {
                newGeom = geoms.collect().union();
            } else {
                // no overlap between geometries, do smart stuff
                double distance = geomA.distance(geomB);
                log.info(String.format("No intersect between merge inputs, interpolating gap. Distance is: %s", distance));
                if (distance > this.mergeGapDist) {
                    throw new IllegalArgumentException(
                            String.format("Merge failed, geometries too far apart (%s)", distance));
                }
                newGeom = GeometrySnapper.snapToSelf(geoms.collect(), mergeGapDist, true);
            }
            log.debug("new geometry: " + newGeom);

            // maybe simplify? needs tolerance param
            // double tolerance = 1d;
            // TopologyPreservingSimplifier simplify = new TopologyPreservingSimplifier(newGeom);
            // simplify.setDistanceTolerance(tolerance);
            // newGeom = simplify.getResultGeometry();
            GeometryTypeConverterFactory cf = new GeometryTypeConverterFactory();
            Converter c = cf.createConverter(Geometry.class,
                    store.getSchema().getGeometryDescriptor().getType().getBinding(),
                    null);
            GeometryType type = store.getSchema().getGeometryDescriptor().getType();
            if (this.strategy.equalsIgnoreCase("replace")) {
                // update existing feature (A) geom, delete merge partner (B)
                store.modifyFeatures(geomAttrName, c.convert(newGeom, type.getBinding()), filterA);
                store.removeFeatures(filterB);
                ids.add(new FeatureIdImpl(this.fidA));
            } else if (this.strategy.equalsIgnoreCase("new")) {
                //delete the source feature (A) and merge partner(B)
                // and create a new feature with the attributes of A but new geom.
                store.removeFeatures(filterA);
                store.removeFeatures(filterB);
                SimpleFeature newFeat = DataUtilities.createFeature(fA.getType(),
                        DataUtilities.encodeFeature(fA, false));
                newFeat.setAttribute(geomAttrName, c.convert(newGeom, type.getBinding()));

                List<SimpleFeature> newFeats = new ArrayList();
                newFeats.add(newFeat);
                ids = store.addFeatures(DataUtilities.collection(newFeats));
            } else {
                throw new IllegalArgumentException("Unknown strategy '" + this.strategy + "', cannot merge.");
            }
            transaction.commit();
        } catch (Exception e) {
            transaction.rollback();
            throw e;
        } finally {
            transaction.close();
        }
        return ids;
    }

    //<editor-fold defaultstate="collapsed" desc="getters en setters">
    @Override
    public ActionBeanContext getContext() {
        return context;
    }

    @Override
    public void setContext(ActionBeanContext context) {
        this.context = context;
    }

    public Application getApplication() {
        return application;
    }

    public void setApplication(Application application) {
        this.application = application;
    }

    public ApplicationLayer getAppLayer() {
        return appLayer;
    }

    public void setAppLayer(ApplicationLayer appLayer) {
        this.appLayer = appLayer;
    }

    public String getStrategy() {
        return strategy;
    }

    public void setStrategy(String strategy) {
        this.strategy = strategy;
    }

    public String getFidA() {
        return fidA;
    }

    public void setFidA(String fidA) {
        this.fidA = fidA;
    }

    public String getFidB() {
        return fidB;
    }

    public void setFidB(String fidB) {
        this.fidB = fidB;
    }

    public int getMergeGapDist() {
        return mergeGapDist;
    }

    public void setMergeGapDist(int mergeGapDist) {
        this.mergeGapDist = mergeGapDist;
    }

    //</editor-fold>
}
