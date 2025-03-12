import React, { useEffect, useRef, useState } from 'react';
import { Point, useSketchStore, SketchDoc } from '../stores/sketchStore';
import UserCursors from './UserCursors';
import * as Automerge from '@automerge/automerge';

type CanvasProps = {
  width: number;
  height: number;
  externalDoc?: Automerge.Doc<SketchDoc>; // Optional prop to accept document from parent
};

const Canvas: React.FC<CanvasProps> = ({ width, height, externalDoc }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { doc: storeDoc, addStroke, updateCursor, userId } = useSketchStore();
  
  // Use external document if provided, otherwise use the one from the store
  const doc = externalDoc || storeDoc;
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [showCursors, setShowCursors] = useState(true);
  const [cursorPosition, setCursorPosition] = useState<{x: number, y: number} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Set a timeout to show loading state
  useEffect(() => {
    // Clear any existing timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    
    // Set a new timeout
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Wait 2 seconds before showing error
    
    setLoadingTimeout(timeout);
    
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, []);

  // Check if document is ready
  useEffect(() => {
    if (doc && doc.canvas) {
      setIsLoading(false);
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    }
  }, [doc, loadingTimeout]);

  // Set up cursor update interval
  useEffect(() => {
    // Only update if we have a cursor position and doc is initialized
    if (cursorPosition && doc && doc.canvas) {
      // Initial update
      updateCursor(cursorPosition.x, cursorPosition.y);
      
      // Set up interval to keep updating cursor position
      const intervalId = setInterval(() => {
        if (cursorPosition && doc && doc.canvas) {
          updateCursor(cursorPosition.x, cursorPosition.y);
        }
      }, 1000); // Update every second
      
      return () => clearInterval(intervalId);
    }
  }, [cursorPosition, updateCursor, doc]);

  // Draw all elements on the canvas
  useEffect(() => {
    if (!doc || !doc.canvas) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    doc.canvas.elements.forEach((element) => {
      if (element.type === 'stroke') {
        ctx.beginPath();
        ctx.strokeStyle = element.color;
        ctx.lineWidth = element.width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const points = element.points;
        if (points.length > 0) {
          ctx.moveTo(points[0][0], points[0][1]);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
          }
        }
        ctx.stroke();
      }
    });

    // Draw current stroke
    if (currentStroke.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.moveTo(currentStroke[0][0], currentStroke[0][1]);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i][0], currentStroke[i][1]);
      }
      ctx.stroke();
    }
  }, [doc, doc?.canvas?.elements, currentStroke, color, strokeWidth]);

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!doc || !doc.canvas) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentStroke([[x, y]]);
    
    // Store cursor position for interval updates
    setCursorPosition({x, y});
    
    // Update cursor position when starting to draw
    updateCursor(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!doc || !doc.canvas) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Store cursor position for interval updates
    setCursorPosition({x, y});
    
    // Always update cursor position for collaboration, whether drawing or not
    updateCursor(x, y);

    if (!isDrawing) return;

    setCurrentStroke((prev) => [...prev, [x, y]]);
  };

  const handleMouseUp = () => {
    if (!doc || !doc.canvas) return;
    
    if (isDrawing && currentStroke.length > 0) {
      addStroke(currentStroke, color, strokeWidth);
      setCurrentStroke([]);
      setIsDrawing(false);
    }
  };

  const handleMouseLeave = () => {
    if (!doc || !doc.canvas) return;
    
    if (isDrawing && currentStroke.length > 0) {
      addStroke(currentStroke, color, strokeWidth);
      setCurrentStroke([]);
      setIsDrawing(false);
    }
  };

  // Add handler for mouse enter to start tracking cursor immediately
  const handleMouseEnter = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!doc || !doc.canvas) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Store cursor position for interval updates
    setCursorPosition({x, y});
    
    // Update cursor position when entering canvas
    updateCursor(x, y);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#e0e0e0', 
        border: '1px solid #808080',
        borderRadius: '5px',
        margin: '10px 0',
        textAlign: 'center',
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '5px solid #c0c0c0',
            borderTopColor: '#000080',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px auto'
          }} />
        </div>
        <h3>Loading Canvas...</h3>
        <p>Please wait while the drawing canvas initializes.</p>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // Check if doc is properly initialized - AFTER all hooks
  if (!doc) {
    console.error('Document is undefined in Canvas component');
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#ffcccc', 
        border: '1px solid #ff0000',
        borderRadius: '5px',
        margin: '10px 0'
      }}>
        <h3>Error: Document is undefined</h3>
        <p>The document object is not available. This might be due to initialization issues.</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '5px 10px',
            backgroundColor: '#ff0000',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }
  
  if (!doc.canvas) {
    console.error('Document canvas is undefined in Canvas component', doc);
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#ffffcc', 
        border: '1px solid #ffcc00',
        borderRadius: '5px',
        margin: '10px 0'
      }}>
        <h3>Error: Canvas is undefined</h3>
        <p>The document is available but the canvas property is missing. Document structure:</p>
        <pre>{JSON.stringify(doc, null, 2)}</pre>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '5px 10px',
            backgroundColor: '#ffcc00',
            color: 'black',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div className="canvas-container">
      <div className="toolbar">
        <div className="color-picker">
          <label htmlFor="stroke-color">Color:</label>
          <input
            type="color"
            id="stroke-color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <div className="stroke-width">
          <label htmlFor="stroke-width">Width:</label>
          <input
            type="range"
            id="stroke-width"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
          />
          <span>{strokeWidth}px</span>
        </div>
        <div className="cursor-toggle">
          <label htmlFor="show-cursors">Show Cursors:</label>
          <input
            type="checkbox"
            id="show-cursors"
            checked={showCursors}
            onChange={(e) => setShowCursors(e.target.checked)}
            style={{
              marginLeft: '5px',
              accentColor: '#000080',
            }}
          />
        </div>
      </div>
      <div style={{ 
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        border: '1px solid #808080'
      }}>
        <canvas
          id="sketch-canvas"
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
          className="drawing-canvas"
          style={{
            position: 'absolute',
            top: 0,
            left: 0
          }}
        />
        {/* Show other users' cursors */}
        {showCursors && <UserCursors currentUserId={userId} />}
      </div>
    </div>
  );
};

export default Canvas; 