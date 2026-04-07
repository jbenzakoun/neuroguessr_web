import React, { useEffect, useRef, useState } from 'react';
import { Niivue } from '@niivue/niivue';
import atlasFiles from '../utils/atlas_files';
import { loadNIfTIFromCache } from '../utils/nifti_cache';
import { fetchJSON } from '../utils/helper_nii';

interface LandingAtlasViewerProps {
  atlasKey?: string;
}

const LandingAtlasViewer: React.FC<LandingAtlasViewerProps> = ({ atlasKey = 'harvard-oxford' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const niivueRef = useRef<Niivue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveAtlasKey = atlasKey && atlasFiles[atlasKey] ? atlasKey : 'harvard-oxford';

  useEffect(() => {
    const loadAtlas = async () => {
      try {
        if (!canvasRef.current) return;

        setIsLoading(true);
        setError(null);

        // Create new Niivue instance with multiplanar render view
        const nv = new Niivue({
          opts: {
            isRadiologicalConvention: true,
            yoke3Dto2DZoom: true,
            crosshairGap: 0,
            multiplanarShowRender: 1,
          },
        });

        // Attach to canvas
        await nv.attachToCanvas(canvasRef.current);
        niivueRef.current = nv;

        // Load MNI background
        const mniUrl = '/atlas/mni152_downsampled.nii.gz';
        const mniData = await loadNIfTIFromCache(mniUrl);
        if (mniData) {
          nv.addVolume(mniData);
        }

        // Load the selected atlas
        const atlas = atlasFiles[effectiveAtlasKey];
        if (!atlas) {
          setError('Atlas not found');
          return;
        }

        // Load atlas NIfTI file with correct path prefix
        const atlasUrl = `/atlas/nii/${atlas.nii}`;
        const atlasData = await loadNIfTIFromCache(atlasUrl);
        if (atlasData) {
          nv.addVolume(atlasData);

          // Load and apply colormap for the atlas with proper labels
          try {
            const jsonUrl = `/atlas/descr/en/${atlas.json}`;
            const colorMapData = await fetchJSON(jsonUrl);
            if (colorMapData && colorMapData.lut) {
              // Apply colormap with labels for distinct colors
              atlasData.setColormapLabel(colorMapData);
            } else {
              nv.setColormap(atlasData.id, 'hsv');
            }
          } catch (err) {
            console.warn('Could not load colormap:', err);
            nv.setColormap(atlasData.id, 'hsv');
          }
          // Boost min/max to push colors into brighter range
          atlasData.cal_min = 0;
          atlasData.cal_max = 48;
          nv.updateGLVolume();
        }

        // Set multiplanar render view (A+C+S+R)
        nv.setSliceType(nv.sliceTypeMultiplanar);
        nv.opts.multiplanarShowRender = 1;

        // Set opacities for blending
        nv.setOpacity(0, 1.0); // MNI background at full opacity
        nv.setOpacity(1, 0.5); // Atlas at 50% opacity — lighter, pastel look

        nv.setClipPlane([2, 270, 0]);
        nv.updateGLVolume();

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load atlas:', err);
        setError(`Failed to load atlas: ${String(err)}`);
        setIsLoading(false);
      }
    };

    loadAtlas();

    return () => {
      // Cleanup
      if (niivueRef.current) {
        try {
          niivueRef.current.removeAllVolumes();
        } catch (e) {
          console.error('Error cleaning up Niivue:', e);
        }
      }
    };
  }, [effectiveAtlasKey]);

  // Handle mouse navigation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!niivueRef.current) return;
    const nv = niivueRef.current as any;
    nv.mouseDown = true;
    nv.lastX = e.clientX;
    nv.lastY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!niivueRef.current) return;
    const nv = niivueRef.current as any;
    if (!nv.mouseDown) return;

    const deltaX = e.clientX - (nv.lastX || 0);
    const deltaY = e.clientY - (nv.lastY || 0);

    // Rotate scene based on mouse movement
    if (nv.scene && nv.scene.azimuth !== undefined) {
      nv.scene.azimuth += deltaX * 0.5;
      nv.scene.elevation += deltaY * 0.5;
      nv.drawScene();
    }

    nv.lastX = e.clientX;
    nv.lastY = e.clientY;
  };

  const handleMouseUp = () => {
    if (!niivueRef.current) return;
    const nv = niivueRef.current as any;
    nv.mouseDown = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!niivueRef.current) return;
    e.preventDefault();

    const nv = niivueRef.current;
    const zoomSpeed = 0.02;
    const direction = e.deltaY > 0 ? -1 : 1;

    if (nv.scene && nv.scene.pan2Dxyzmm) {
      nv.scene.pan2Dxyzmm[3] = Math.max(0.3, Math.min(8, (nv.scene.pan2Dxyzmm[3] || 1) + direction * zoomSpeed));
      nv.drawScene();
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 10,
            fontSize: '0.9rem',
            color: '#ccc',
          }}
        >
          Loading atlas...
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 10,
            fontSize: '0.85rem',
            color: '#f87171',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'grab',
          outline: 'none',
        }}
        id="landing-canvas"
      />
    </div>
  );
};

export default LandingAtlasViewer;
