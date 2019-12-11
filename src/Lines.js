import * as maptalks from 'maptalks';
import * as THREE from 'three';
import BaseObject from './BaseObject';
import { getLinePosition } from './util/LineUtil';
import MergedMixin from './MergedMixin';
import { getCenterOfPoints } from './util/ExtrudeUtil';
import Line from './Line';


const OPTIONS = {
    altitude: 0,
    colors: null
};

/**
 *
 */
class Lines extends MergedMixin(BaseObject) {
    constructor(lineStrings, options, material, layer) {
        if (!Array.isArray(lineStrings)) {
            lineStrings = [lineStrings];
        }

        const centers = [];
        const len = lineStrings.length;
        for (let i = 0; i < len; i++) {
            const lineString = lineStrings[i];
            centers.push(lineString.getCenter());
        }
        // Get the center point of the point set
        const center = getCenterOfPoints(centers);
        options = maptalks.Util.extend({}, OPTIONS, options, { layer, lineStrings, coordinate: center });

        const lines = [];
        let faceIndex = 0, faceMap = {}, geometriesAttributes = {},
            psIndex = 0, ps = [];
        for (let i = 0; i < len; i++) {
            const lineString = lineStrings[i];
            const opts = maptalks.Util.extend({}, { altitude: options.altitude, index: i }, lineString.getProperties());
            const { positionsV } = getLinePosition(lineString, layer, center);

            for (let j = 0, len1 = positionsV.length; j < len1; j++) {
                const v = positionsV[j];
                if (j > 0 && j < len1 - 1) {
                    ps.push(v.x, v.y, v.z);
                }
                ps.push(v.x, v.y, v.z);
            }

            const line = new Line(lineString, opts, material, layer);
            lines.push(line);

            const psCount = positionsV.length + positionsV.length - 2;
            const faceLen = psCount;
            faceMap[i] = [faceIndex, faceIndex + faceLen];
            faceIndex += faceLen;

            geometriesAttributes[i] = {
                position: {
                    count: psCount,
                    start: psIndex,
                    end: psIndex + psCount * 3,
                },
                hide: false
            };
            psIndex += psCount * 3;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.addAttribute('position', new THREE.Float32BufferAttribute(ps, 3));
        super();
        this._initOptions(options);

        this._createLineSegments(geometry, material);

        const { altitude } = options;
        const z = layer.distanceToVector3(altitude, altitude).x;
        const v = layer.coordinateToVector3(center, z);
        this.getObject3d().position.copy(v);

        this._faceMap = faceMap;
        this._baseObjects = lines;
        this._datas = lineStrings;
        this._geometriesAttributes = geometriesAttributes;
        this.faceIndex = null;
        this.index = null;
        this._geometryCache = geometry.clone();
        this.isHide = false;

        lines.forEach(line => {
            this._proxyEvent(line);
        });
    }

    // eslint-disable-next-line consistent-return
    getSelectMesh() {
        const index = this._getIndex();
        if (index != null) {
            return {
                data: this._datas[index],
                baseObject: this._baseObjects[index]
            };
        }
    }

    // eslint-disable-next-line consistent-return
    _getIndex(faceIndex) {
        if (faceIndex == null) {
            faceIndex = this.faceIndex || this.index;
        }
        if (faceIndex != null) {
            for (let index in this._faceMap) {
                const [start, end] = this._faceMap[index];
                if (start <= faceIndex && faceIndex < end) {
                    return index;
                }
            }
        }
    }
}

export default Lines;
