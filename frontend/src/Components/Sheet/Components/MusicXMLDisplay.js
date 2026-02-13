import React, { useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import axios from 'axios';
import SkeletonSheet from './SkeletonSheet';

const MusicXMLDisplay = ({ fileUrl, fileName, width }) => {
  const containerRef = useRef(null);
  const osmdRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState(null);

  // Helper to safely render OSMD without freezing UI immediately
  const renderOSMD = React.useCallback((osmdInstance) => {
    return new Promise((resolve) => {
      setIsRendering(true);
      // Use setTimeout to allow React to render the loading state first
      setTimeout(() => {
        try {
          osmdInstance.render();
        } catch (e) {
          console.error("OSMD Render error: ", e);
        } finally {
          setIsRendering(false);
          resolve();
        }
      }, 0);
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    // Capture the current ref value for cleanup
    const currentContainer = containerRef.current;

    const setupOSMD = async () => {
      if (!currentContainer) return;

      try {
        setLoading(true);
        setError(null);

        console.log("OSMD: Fetching", fileUrl);
        const response = await axios.get(fileUrl, {
           responseType: 'arraybuffer',
        });

        const arrayBuffer = response.data;
        
        // Initialize OSMD (only if not already initialized)
        if (!osmdRef.current) {
          osmdRef.current = new OpenSheetMusicDisplay(currentContainer, {
            // autoResize: false, // Handle resize manually to debounce it
            backend: "canvas", // Canvas is much faster for large files
            drawingParameters: "compacttight", // Most optimized for performance
            drawTitle: true,
            drawSubtitle: true,
            drawComposer: true,
            alignRests: 2, 
            autoBeam: true,
            stretchLastSystemLine: true,
          });
        }
        
        const osmd = osmdRef.current;

        let xmlContent = null;
        const uint8 = new Uint8Array(arrayBuffer);
        const isZip = uint8[0] === 0x50 && uint8[1] === 0x4B; // PK start

        if (isZip) {
          console.log("OSMD: Detected MXL (ZIP archive), unzipping...");
          const JSZip = require('jszip');
          const zip = await JSZip.loadAsync(arrayBuffer);
          
          let rootFile = null;
          const containerFile = zip.file("META-INF/container.xml");
          if (containerFile) {
            const containerXml = await containerFile.async("string");
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(containerXml, "text/xml");
            const rootfileTag = xmlDoc.getElementsByTagName("rootfile")[0];
            if (rootfileTag) {
              rootFile = rootfileTag.getAttribute("full-path");
            }
          }

          if (!rootFile) {
            const files = Object.keys(zip.files);
            rootFile = files.find(f => (f.endsWith(".xml") || f.endsWith(".musicxml")) && !f.startsWith("META-INF/"));
          }

          if (rootFile) {
            xmlContent = await zip.file(rootFile).async("string");
          } else {
            throw new Error("Could not find MusicXML file inside MXL archive");
          }
        } else {
          const decoder = new TextDecoder("utf-8");
          xmlContent = decoder.decode(arrayBuffer);
        }

        if (mounted) {
          console.log("OSMD: Loading XML...");
          await osmd.load(xmlContent);
          osmd.Zoom = 0.5; // Updated to match user's latest preference
          console.log("OSMD: Rendering...");
          
          // Use our optimized render helper
          await renderOSMD(osmd);

          setLoading(false);
        }
      } catch (err) {
        console.error("OSMD Error detail:", err);
        if (mounted) {
          setError(err);
          setLoading(false);
          setIsRendering(false);
        }
      }
    };

    setupOSMD();

    return () => {
      mounted = false;
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
    };
  }, [fileUrl, renderOSMD]);


  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isFullScreen) {
        if (e.key === 'Escape') {
          setIsFullScreen(false);
        } else if (e.key === 'ArrowDown') {
          if (wrapperRef.current) {
            wrapperRef.current.scrollBy({ top: 200, behavior: 'smooth' });
          }
        } else if (e.key === 'ArrowUp') {
           if (wrapperRef.current) {
            wrapperRef.current.scrollBy({ top: -200, behavior: 'smooth' });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen]);

  if (error) {
    return <div className="osmd-error">Error loading sheet music: {error.message}</div>;
  }

  const fullScreenStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    minWidth: '100vw',
    height: '100vh',
    zIndex: 9999,
    backgroundColor: '#333',
    overflowY: 'auto',
    overflowX: 'auto',
    padding: '0',
    borderRadius: 0,
  };

  const defaultStyles = {
    width: '100%', 
    height: window.innerHeight > 840 ? '85vh' : '65vh',
    overflowY: 'auto',
    overflowX: 'auto', 
    backgroundColor: 'white',
    boxShadow: '0 2px 5px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)',
    borderRadius: '15px',
    boxSizing: 'border-box',
    padding: '5px', // Slight outer padding for the scrollbar
    position: 'relative'
  };

  return (
    <div 
      ref={wrapperRef}
      className="osmd-container-wrapper" 
      style={isFullScreen ? fullScreenStyles : defaultStyles}
    >
      <div style={{ position: 'sticky', top: 0, right: 0, width: '100%', pointerEvents: 'none', zIndex: 1000 }}>
        <button 
          onClick={toggleFullScreen}
          style={isFullScreen ? {
            position: 'fixed',
            top: '20px',
            right: '25px', 
            zIndex: 10000,
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            padding: '5px 10px',
            cursor: 'pointer',
            pointerEvents: 'auto'
          } : {
            position: 'sticky',
            float: 'right',
            top: '15px',
            right: '15px',
            zIndex: 1000,
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            padding: '5px 10px',
            cursor: 'pointer',
            pointerEvents: 'auto'
          }}
        >
          ⛶
        </button>
      </div>

      <div 
        style={{
          width: isFullScreen ? '100vw' : '100%',
          backgroundColor: isFullScreen ? 'transparent' : 'white',
          minHeight: isFullScreen ? '100.1vh' : 'auto', // Force scroll context
          padding: isFullScreen ? '40px 0' : '0', // Top/bottom padding for the backdrop
          margin: isFullScreen ? '0 auto' : '0',
          display: 'flex',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}
      >
        <div 
          className="white-page-wrapper"
          style={{
            width: isMobile ? '100vw' : '900px', // Normalized width
            backgroundColor: 'white',
            boxShadow: isFullScreen ? '0 4px 15px rgba(0,0,0,0.3)' : 'none',
            padding: '0px 40px',
            boxSizing: 'border-box',
            position: 'relative', // Context for absolute loading
            minHeight: '200px'
          }}
        >
          {/* Show Skeleton while loading OR currently rendering */}
          {(loading || isRendering) && (
            <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                zIndex: 10, 
                backgroundColor: 'white',
                padding: isFullScreen ? '40px 60px' : '20px' 
            }}>
                <SkeletonSheet />
            </div>
          )}
          
          <div 
            ref={containerRef} 
            className="osmd-container" 
            style={{ 
              width: '100%',
              boxSizing: 'border-box',
              visibility: (loading || isRendering) ? 'hidden' : 'visible', // Hide half-rendered content
              minHeight: '200px'
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default MusicXMLDisplay;
