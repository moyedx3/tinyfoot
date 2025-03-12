import React, { useState, useEffect, useCallback } from 'react';
import Canvas from '../components/Canvas';
import StickyNote from '../components/StickyNote';
import AddStickyNote from '../components/AddStickyNote';
import ExportOptions from '../components/ExportOptions';
import { useSketchStore } from '../stores/sketchStore';
import * as Automerge from '@automerge/automerge';

const Sketch: React.FC = () => {
  const { doc, updateTitle, connected, resetDocument, initializationError, addNote: storeAddNote, updateNote: storeUpdateNote } = useSketchStore();
  const [title, setTitle] = useState<string>('Untitled Sketch');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [resetAttempted, setResetAttempted] = useState(false);
  const [localDoc, setLocalDoc] = useState(doc);

  // Force document initialization if needed
  useEffect(() => {
    if (!doc) {
      console.log('Sketch component: Document is undefined, attempting to force initialization');
      const success = resetDocument();
      console.log('Force initialization result:', success);
    } else {
      setLocalDoc(doc);
    }
  }, [doc, resetDocument]);

  // Update title when doc changes
  useEffect(() => {
    if (localDoc && localDoc.canvas) {
      setTitle(localDoc.canvas.title);
    }
  }, [localDoc]);

  // Local implementation of addNote that updates the local document
  const addNote = useCallback((text: string, position: { x: number; y: number }, color: string) => {
    if (!localDoc || !localDoc.canvas) {
      console.warn('Cannot add note: local document not initialized');
      return;
    }
    
    // First try to use the store's addNote function
    if (doc && doc.canvas) {
      storeAddNote(text, position, color);
      return;
    }
    
    // Fallback: update the local document directly
    try {
      const timestamp = Date.now();
      const id = Math.random().toString(36).substring(2, 15);
      
      const newDoc = Automerge.change(localDoc, (doc) => {
        if (!doc.canvas) {
          doc.canvas = {
            elements: [],
            cursors: {},
            title: 'Untitled Sketch'
          };
        }
        
        if (!doc.canvas.elements) {
          doc.canvas.elements = [];
        }
        
        doc.canvas.elements.push({
          id,
          type: 'note',
          text,
          position,
          color,
          creator: 'local-user',
          timestamp,
        });
      });
      
      setLocalDoc(newDoc);
      console.log('Added note to local document');
    } catch (error) {
      console.error('Error adding note to local document:', error);
    }
  }, [localDoc, doc, storeAddNote]);

  // Local implementation of updateNote that updates the local document
  const updateNote = useCallback((id: string, text: string) => {
    if (!localDoc || !localDoc.canvas) {
      console.warn('Cannot update note: local document not initialized');
      return;
    }
    
    // First try to use the store's updateNote function
    if (doc && doc.canvas) {
      storeUpdateNote(id, text);
      return;
    }
    
    // Fallback: update the local document directly
    try {
      const newDoc = Automerge.change(localDoc, (doc) => {
        if (!doc.canvas || !doc.canvas.elements) return;
        
        const note = doc.canvas.elements.find(
          (el) => el.id === id && el.type === 'note'
        );
        
        if (note && note.type === 'note') {
          note.text = text;
          note.timestamp = Date.now();
        }
      });
      
      setLocalDoc(newDoc);
      console.log('Updated note in local document');
    } catch (error) {
      console.error('Error updating note in local document:', error);
    }
  }, [localDoc, doc, storeUpdateNote]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (localDoc && localDoc.canvas) {
      updateTitle(title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false);
      if (localDoc && localDoc.canvas) {
        updateTitle(title);
      }
    }
  };

  const handleReset = () => {
    console.log('Attempting to reset document...');
    const success = resetDocument();
    setResetAttempted(true);
    
    if (success) {
      console.log('Document reset successful');
    } else {
      console.error('Document reset failed');
      // Create a fallback document directly in the component
      try {
        console.log('Creating fallback document directly in Sketch component');
        const emptyDoc = {
          canvas: {
            elements: [],
            cursors: {},
            title: 'Untitled Sketch',
          }
        };
        const newDoc = Automerge.from(emptyDoc);
        setLocalDoc(newDoc);
        console.log('Created fallback document:', newDoc);
      } catch (error) {
        console.error('Failed to create fallback document:', error);
        // Force page reload as last resort
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  };

  // Canvas dimensions
  const canvasWidth = 800;
  const canvasHeight = 600;

  // Check if doc is properly initialized - AFTER all hooks
  if (!localDoc) {
    console.error('Document is undefined in Sketch component');
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#ffcccc', 
        border: '1px solid #ff0000',
        borderRadius: '5px',
        maxWidth: '800px',
        margin: '20px auto'
      }}>
        <h3>Error: Document is undefined</h3>
        <p>The document object is not available. This might be due to initialization issues.</p>
        {initializationError && (
          <div style={{
            backgroundColor: '#fff',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            marginBottom: '15px',
            fontFamily: 'monospace',
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
            overflowX: 'auto'
          }}>
            <strong>Error details:</strong> {initializationError}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleReset}
            disabled={resetAttempted}
            style={{
              padding: '5px 10px',
              backgroundColor: resetAttempted ? '#cccccc' : '#0000ff',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: resetAttempted ? 'not-allowed' : 'pointer'
            }}
          >
            {resetAttempted ? 'Reset Attempted...' : 'Reset Document'}
          </button>
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
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          backgroundColor: '#f0f0f0',
          borderRadius: '3px',
          fontSize: '12px'
        }}>
          <p><strong>Troubleshooting steps:</strong></p>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Try clicking "Reset Document" to create a fresh document.</li>
            <li>If that doesn't work, click "Reload Page" to refresh the application.</li>
            <li>Check your browser console for more detailed error messages.</li>
            <li>Clear your browser cache and cookies, then try again.</li>
            <li>If the problem persists, try using a different browser.</li>
          </ol>
        </div>
      </div>
    );
  }
  
  if (!localDoc.canvas) {
    console.error('Document canvas is undefined in Sketch component', localDoc);
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#ffffcc', 
        border: '1px solid #ffcc00',
        borderRadius: '5px',
        maxWidth: '800px',
        margin: '10px auto'
      }}>
        <h3>Error: Canvas is undefined</h3>
        <p>The document is available but the canvas property is missing.</p>
        <div style={{
          backgroundColor: '#fff',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '3px',
          marginBottom: '15px',
          fontFamily: 'monospace',
          fontSize: '12px',
          maxHeight: '200px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          overflowX: 'auto'
        }}>
          <strong>Document structure:</strong>
          <pre>{JSON.stringify(localDoc, null, 2)}</pre>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleReset}
            disabled={resetAttempted}
            style={{
              padding: '5px 10px',
              backgroundColor: resetAttempted ? '#cccccc' : '#0000ff',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: resetAttempted ? 'not-allowed' : 'pointer'
            }}
          >
            {resetAttempted ? 'Reset Attempted...' : 'Reset Document'}
          </button>
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
      </div>
    );
  }

  return (
    <div className="sketch-app" style={{ 
      fontFamily: '"MS Sans Serif", Arial, sans-serif',
      color: '#000',
      backgroundColor: '#008080', // Classic teal background
      minHeight: '100vh',
      padding: '20px',
      backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAIAAACRXR/mAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH5gMQDwkQmKzGJQAAAGZJREFUWMPt1TEKwDAMQ1E5+/4X9QCtk0MhJcRI/s/ZBVkWfbJor5K0ztxZ6q5gZvbVgpmBmYGZgZmBmYGZgZmBmYGZgZmBmYGZgZmBmYGZgZmBmYGZgZmBmYGZgZmBmYGZgZmBmYGZgZnxAUMVBnIDYOgDAAAAAElFTkSuQmCC")',
    }}>
      <div style={{ 
        maxWidth: '1000px', 
        margin: '0 auto',
        backgroundColor: '#c0c0c0',
        border: '2px solid #000080',
        boxShadow: '5px 5px 0 #808080',
        padding: '2px',
        marginBottom: '20px',
      }}>
        <div style={{ 
          backgroundColor: '#000080', 
          color: 'white', 
          padding: '2px 5px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                style={{
                  fontFamily: '"MS Sans Serif", Arial, sans-serif',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  padding: '2px',
                  width: '300px',
                }}
              />
            ) : (
              <span 
                onClick={() => setIsEditingTitle(true)}
                style={{ fontWeight: 'bold', cursor: 'pointer' }}
              >
                {title}
              </span>
            )}
            <span style={{ 
              marginLeft: '10px', 
              fontSize: '12px',
              backgroundColor: connected ? '#00aa00' : '#aa0000',
              color: 'white',
              padding: '1px 5px',
              borderRadius: '3px',
            }}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ marginRight: '5px' }}>_</span>
            <span style={{ marginRight: '5px' }}>□</span>
            <span>×</span>
          </div>
        </div>
        
        <div style={{ padding: '15px' }}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ 
                fontFamily: '"Comic Sans MS", cursive, sans-serif',
                color: '#800080',
                textShadow: '1px 1px 2px #000',
                margin: '0 0 10px 0',
                fontSize: '24px',
              }}>
                TinySketch - Early 2000s Edition
              </h1>
              <div style={{ 
                fontFamily: '"Times New Roman", serif',
                fontSize: '14px',
                marginBottom: '10px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}>
                <div 
                  style={{ 
                    animation: 'marquee 15s linear infinite',
                    display: 'inline-block',
                    width: '400px',
                  }}
                >
                  Welcome to TinySketch! Draw and collaborate in real-time. Double-click to edit sticky notes.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <ExportOptions />
              <button
                onClick={handleReset}
                style={{
                  padding: '3px 8px',
                  backgroundColor: '#c0c0c0',
                  border: '2px outset #c0c0c0',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: '"MS Sans Serif", Arial, sans-serif',
                }}
              >
                New Sketch
              </button>
            </div>
          </div>
          
          <AddStickyNote 
            canvasWidth={canvasWidth} 
            canvasHeight={canvasHeight} 
            externalAddNote={addNote}
          />
          
          <div style={{ 
            position: 'relative',
            border: '3px inset #c0c0c0',
            backgroundColor: '#ffffff',
            marginBottom: '20px',
          }}>
            <Canvas width={canvasWidth} height={canvasHeight} externalDoc={localDoc} />
            
            {/* Render all sticky notes */}
            {localDoc.canvas.elements.map((element) => {
              if (element.type === 'note') {
                return (
                  <StickyNote 
                    key={element.id} 
                    note={element} 
                    externalUpdateNote={updateNote}
                  />
                );
              }
              return null;
            })}
          </div>
          
          <div style={{ 
            textAlign: 'center',
            borderTop: '1px solid #808080',
            paddingTop: '10px',
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
          }}>
            <div>© 2024 TinySketch - Best viewed in Netscape Navigator 4.0 or Internet Explorer 5.5</div>
            <div style={{ marginTop: '5px' }}>
              <img 
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH5gMQDwwfVs5CTwAAA7hJREFUaN7tmU1IVFEUx3/nzYyWJUn0YamVRR+LwlpkRBQtgqBFEZKbIKJFQUEQRIsWfUBBq4iiRR9QVC2CIFoUFBRF9mEUlVlmZqWVjjP3tHhvGnXUeTPv3TejzH/z5t1z7v/87z33nHvvFVWlmOFELQDYCmwCWoEVQBPQANQCFcAk8Ar4BAwAT4AHwFPgV1QCqWrOD7AJuAyMAJrjMwJcAjbmW4CcHKhUVU+AiMgq4BKwPU/OZYJ7wGFVHQ5bMGcHVHUyQOgAcBZYlC8Pp2EcOKGqN8IUCu2AiNQDV4FtYcvkgJvAQVX9nq1AqBgQkRrgJrA2jPwc8QzYpaqfs3k5tAMiUgbcAjaEkZcnbAbas3k5rAMngL0hZeUTe0XkeLYvhYoBEdkO3KGwMZAOCWCbqj7I9IVQDojIYuAhsDyMnDnCMHCfZDY7CnxQ1R+ZXg7rwAVgdUg5c4FxoAe4DXQDz1X1d7qXQjkgIruBnWFkzQKjwFngiqpOZPNSGAdKgNNhBM0CfcBuVX2Zi4BQWamI7AeW5SokT/gKHMrVeAjpgIiUACfDCMkTTmUbsJkQ1oEDQEsYIXnAC+BqGEFhHdgXUk4+cCaMkLAO5FJR5RMPVbU/jKCwDjSGlJMPhI6zsA7UhZSTD4SOszlxQEQcEakWkQoRcfIhNAPqwwoKFQMiUiUiJ0VkEPgJfCOZBo8Bg8lnlSLSICJlIeVWhhUUZieWAHYDZ4D6LN7/CnQBF1X1WQ7yQscAhHOgCugAerMYD1AHHAV6RaRDRBaGkD0rDmwEHgFHCFdFNgOXgQERaQshZ3YcALqANXmQWwNcF5GuEHJmxQERWQpszZPsLSLSGkLOrDgA7MjjjLQjhIxZcWBVHmWvDCFjVhwI3FTNQG0IGbPiwKc8yv4YQsasONADJPIkOwH0hpAxKw6o6lvgTp7kd6nqUAgZs1UPtAGDc2z8INCmqokQcmbFAVUdAQ4Bv+bI+F/AYVX9EkZQqJJCVe8CR4HpOTB+GjiiqvfCCgudTqvqNaANmJ5F46eANlXtykVY6J1YAFXtFJFu4BywMQ/GJ4BzwIVcjYc87cQCqOoQsAU4DbzJg/FvSO7yW1T1Wr6Mhzw7EEBVp1S1XVVXALuAi8D7HIwfJFnLrFDV9nwbDwW4qCMiDcA6YDXJy0LNJHdpVSQvC02QvCz0gWQF1k/yFtxgIa6q/wGRpchYQvT8jQAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMi0wMy0xNlQxNToxMjozMSswMDowMDzr2J8AAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjItMDMtMTZUMTU6MTI6MzErMDA6MDBNtmAjAAAAAElFTkSuQmCC" 
                alt="Netscape" 
                style={{ height: '20px', marginRight: '10px' }}
              />
              <img 
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH5gMQDw0inrqE9AAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAACDklEQVQ4y4WSzUtUURjGf+fce+/MdUadGcdxdLSxFkFEVLRpE0EFbYI2QRsXtWsVRf9A9AcUFBRUVLSLoA8IiwgigooWUWiWJJYfOeN4Z+7XOacWjkzjRc/uPed9n+d9znlfoaocrxwHYsAS0A+kAQswQBFYBHLAHPADKKiqHHegE9gP9AG7gR4gDXQAMaAELAMFYAGYAT4Dn4BvQNk5kAb2AQPAXmAXkAFSwFYgDkSBCOACHrAGrALfgWngI/AemBORMtAJHAKOAIeBfcAOIAkkgBgQAQLAAX8BK8A88AZ4BbxU1aKISA9wDDgJDALbgVbABRzAAH7NvgEqQBmYBJ4Dz1R1WkSkCzgNnAf6gZZa4xpUa1ZrDVYVay0B8B14DDxU1QkRkRRwEbgEdNWMDWCsxVqLqmKMwRiDiOA4DhKEGGAUuKeqYyIiMeAacKXWHFXFGEMYhoRhSBAEVCoVgiDA933K5TK+7+P7PmvlMr7vE4YhInITuCEiMeCBqg6JCMYYgiCgWCxSKBTI5/Pk83kWFxfJ5XIsLS2xsrJCsVikVCpRqVQwxmCMQVVvicgDEZEpVR0QEay1lEolCoUCuVyO2dlZZmZmmJ+fZ3l5mfX1dTzPwxiDtRYRQVVR1UERmRKgHYiLCNZaKpUKnuextraG53n4vk8QBIRhiIhgjMFai4igqojIdhGJy7/vvAn8Bv4Af/kPUdW/6Jz3fwGKFuU5urwZIQAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMi0wMy0xNlQxNToxMzozNCswMDowMKCA7scAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjItMDMtMTZUMTU6MTM6MzQrMDA6MDDx3VZ7AAAAAElFTkSuQmCC" 
                alt="IE" 
                style={{ height: '20px' }}
              />
            </div>
            <div style={{ marginTop: '10px' }}>
              <span style={{ 
                backgroundColor: '#ffff00', 
                padding: '2px 5px', 
                border: '1px solid #000',
                fontWeight: 'bold',
                fontSize: '10px',
              }}>
                UNDER CONSTRUCTION
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sketch; 