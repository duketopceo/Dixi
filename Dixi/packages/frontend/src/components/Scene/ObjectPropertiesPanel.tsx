import React, { useState, useEffect } from 'react';
import { useSceneStore, SceneObject, ObjectType } from '../../store/sceneStore';
import './ObjectPropertiesPanel.css';

interface ObjectPropertiesPanelProps {
  objectId: string | null;
  onClose?: () => void;
}

export const ObjectPropertiesPanel: React.FC<ObjectPropertiesPanelProps> = ({ objectId, onClose }) => {
  const getObject = useSceneStore((state) => state.getObject);
  const updateObject = useSceneStore((state) => state.updateObject);
  const [object, setObject] = useState<SceneObject | undefined>(undefined);
  const [localPosition, setLocalPosition] = useState<[number, number, number]>([0, 0, -2]);
  const [localRotation, setLocalRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [localScale, setLocalScale] = useState<[number, number, number]>([0.5, 0.5, 0.5]);
  const [localColor, setLocalColor] = useState<string>('#00F5FF');
  const [localType, setLocalType] = useState<ObjectType>('box');

  useEffect(() => {
    if (objectId) {
      const obj = getObject(objectId);
      if (obj) {
        setObject(obj);
        setLocalPosition(obj.position);
        setLocalRotation(obj.rotation);
        setLocalScale(obj.scale);
        setLocalColor(obj.color);
        setLocalType(obj.type);
      }
    } else {
      setObject(undefined);
    }
  }, [objectId, getObject]);

  if (!objectId || !object) {
    return (
      <div className="object-properties-panel empty">
        <div className="properties-empty-message">
          Select an object to edit its properties
        </div>
      </div>
    );
  }

  const handleApply = () => {
    updateObject(objectId, {
      position: localPosition,
      rotation: localRotation,
      scale: localScale,
      color: localColor,
      type: localType,
    });
  };

  const handleReset = () => {
    if (object) {
      setLocalPosition(object.position);
      setLocalRotation(object.rotation);
      setLocalScale(object.scale);
      setLocalColor(object.color);
      setLocalType(object.type);
    }
  };

  const objectTypes: ObjectType[] = ['box', 'sphere', 'torus', 'cone', 'cylinder', 'octahedron', 'tetrahedron', 'plane', 'ring'];

  return (
    <div className="object-properties-panel">
      <div className="properties-header">
        <h3>Object Properties</h3>
        {onClose && (
          <button className="properties-close" onClick={onClose} title="Close">
            ×
          </button>
        )}
      </div>

      <div className="properties-content">
        {/* Object Type */}
        <div className="property-group">
          <label className="property-label">Type</label>
          <select
            className="property-select"
            value={localType}
            onChange={(e) => setLocalType(e.target.value as ObjectType)}
          >
            {objectTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Color Picker */}
        <div className="property-group">
          <label className="property-label">Color</label>
          <div className="color-picker-container">
            <input
              type="color"
              className="color-picker"
              value={localColor}
              onChange={(e) => setLocalColor(e.target.value)}
            />
            <input
              type="text"
              className="color-input"
              value={localColor}
              onChange={(e) => setLocalColor(e.target.value)}
              placeholder="#00F5FF"
            />
          </div>
        </div>

        {/* Position */}
        <div className="property-group">
          <label className="property-label">Position</label>
          <div className="property-inputs">
            <div className="property-input">
              <label>X</label>
              <input
                type="number"
                step="0.1"
                value={localPosition[0].toFixed(2)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setLocalPosition([val, localPosition[1], localPosition[2]]);
                }}
              />
            </div>
            <div className="property-input">
              <label>Y</label>
              <input
                type="number"
                step="0.1"
                value={localPosition[1].toFixed(2)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setLocalPosition([localPosition[0], val, localPosition[2]]);
                }}
              />
            </div>
            <div className="property-input">
              <label>Z</label>
              <input
                type="number"
                step="0.1"
                value={localPosition[2].toFixed(2)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setLocalPosition([localPosition[0], localPosition[1], val]);
                }}
              />
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div className="property-group">
          <label className="property-label">Rotation</label>
          <div className="property-inputs">
            <div className="property-input">
              <label>X</label>
              <input
                type="number"
                step="0.1"
                value={localRotation[0].toFixed(2)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setLocalRotation([val, localRotation[1], localRotation[2]]);
                }}
              />
            </div>
            <div className="property-input">
              <label>Y</label>
              <input
                type="number"
                step="0.1"
                value={localRotation[1].toFixed(2)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setLocalRotation([localRotation[0], val, localRotation[2]]);
                }}
              />
            </div>
            <div className="property-input">
              <label>Z</label>
              <input
                type="number"
                step="0.1"
                value={localRotation[2].toFixed(2)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setLocalRotation([localRotation[0], localRotation[1], val]);
                }}
              />
            </div>
          </div>
        </div>

        {/* Scale */}
        <div className="property-group">
          <label className="property-label">Scale</label>
          <div className="property-slider-container">
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={localScale[0]}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setLocalScale([val, val, val]);
              }}
              className="property-slider"
            />
            <span className="property-slider-value">{localScale[0].toFixed(2)}</span>
          </div>
          <div className="property-inputs">
            <div className="property-input">
              <label>X</label>
              <input
                type="number"
                min="0.1"
                max="2.0"
                step="0.05"
                value={localScale[0].toFixed(2)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0.5;
                  setLocalScale([val, localScale[1], localScale[2]]);
                }}
              />
            </div>
            <div className="property-input">
              <label>Y</label>
              <input
                type="number"
                min="0.1"
                max="2.0"
                step="0.05"
                value={localScale[1].toFixed(2)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0.5;
                  setLocalScale([localScale[0], val, localScale[2]]);
                }}
              />
            </div>
            <div className="property-input">
              <label>Z</label>
              <input
                type="number"
                min="0.1"
                max="2.0"
                step="0.05"
                value={localScale[2].toFixed(2)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0.5;
                  setLocalScale([localScale[0], localScale[1], val]);
                }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="property-actions">
          <button className="property-button apply" onClick={handleApply}>
            Apply
          </button>
          <button className="property-button reset" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

