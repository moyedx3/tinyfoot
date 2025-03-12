import * as Automerge from '@automerge/automerge';
import { useEffect, useState, useRef, useCallback } from 'react';

// Define our document types
export type Point = [number, number];

export type StrokeElement = {
  id: string;
  type: 'stroke';
  points: Point[];
  color: string;
  width: number;
  creator: string;
  timestamp: number;
};

export type NoteElement = {
  id: string;
  type: 'note';
  text: string;
  position: { x: number; y: number };
  color: string;
  creator: string;
  timestamp: number;
};

export type CanvasElement = StrokeElement | NoteElement;

export type Cursor = {
  position: { x: number; y: number };
  lastActive: number;
};

export type SketchDoc = {
  canvas: {
    elements: CanvasElement[];
    cursors: { [userId: string]: Cursor };
    title: string;
  };
};

// Create an empty document structure
const emptyDoc: SketchDoc = {
  canvas: {
    elements: [],
    cursors: {},
    title: 'Untitled Sketch',
  }
};

// Generate a unique ID for elements
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

// Store for managing the document
export const useSketchStore = () => {
  console.log('Initializing sketchStore');
  
  // Create a userId first
  const [userId] = useState<string>(() => {
    // Try to get existing userId from localStorage
    const savedUserId = localStorage.getItem('tinyfoot_userId');
    if (savedUserId) {
      console.log('Using existing userId from localStorage:', savedUserId);
      return savedUserId;
    }
    
    // Generate a new userId
    const newUserId = generateId();
    console.log('Generated new userId:', newUserId);
    localStorage.setItem('tinyfoot_userId', newUserId);
    return newUserId;
  });
  
  // Initialize document with a guaranteed structure
  const initializeDocument = useCallback(() => {
    try {
      console.log('Creating new document with structure:', emptyDoc);
      // First try to create a document from the empty structure
      return Automerge.from<SketchDoc>(emptyDoc);
    } catch (error) {
      console.error('Error creating document from structure:', error);
      try {
        // If that fails, try creating an empty document and adding the structure
        console.log('Falling back to manual document creation');
        return Automerge.change(Automerge.init<SketchDoc>(), doc => {
          doc.canvas = {
            elements: [],
            cursors: {},
            title: 'Untitled Sketch'
          };
        });
      } catch (fallbackError) {
        console.error('Fallback document creation also failed:', fallbackError);
        // Last resort: create a completely empty document
        const emptyAutomergeDoc = Automerge.init<any>();
        console.log('Created empty document as last resort:', emptyAutomergeDoc);
        return emptyAutomergeDoc;
      }
    }
  }, []);
  
  // Initialize the document state
  const [doc, setDoc] = useState<Automerge.Doc<SketchDoc>>(initializeDocument);
  const [connected, setConnected] = useState<boolean>(false);
  const [initializationAttempts, setInitializationAttempts] = useState<number>(0);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Ensure document is properly initialized
  useEffect(() => {
    // Only attempt to fix the document a limited number of times to prevent infinite loops
    if ((!doc || !doc.canvas) && initializationAttempts < 3) {
      console.warn(`Document not properly initialized (attempt ${initializationAttempts + 1}/3), creating a new one`);
      setInitializationAttempts(prev => prev + 1);
      
      try {
        // Create a new document with the proper structure
        const newDoc = Automerge.change(Automerge.init<SketchDoc>(), doc => {
          doc.canvas = {
            elements: [],
            cursors: {},
            title: 'Untitled Sketch'
          };
        });
        
        console.log('Created new document with canvas:', newDoc);
        setDoc(newDoc);
        setInitializationError(null);
      } catch (error) {
        console.error('Error creating new document:', error);
        setInitializationError(`Failed to initialize document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, [doc, initializationAttempts]);
  
  // Log document state on initialization
  useEffect(() => {
    console.log('Document state:', doc);
    console.log('Document canvas:', doc?.canvas);
    console.log('User ID:', userId);
    
    // Debug: Check if the document is a valid Automerge document
    try {
      if (doc) {
        const serialized = Automerge.save(doc);
        console.log('Document can be serialized:', serialized.length > 0);
      }
    } catch (error) {
      console.error('Document serialization error:', error);
      setInitializationError(`Document serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [doc, userId]);
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (!doc || !doc.canvas) {
      console.warn('Document not ready for WebSocket connection');
      return;
    }
    
    console.log('Setting up WebSocket connection');
    const ws = new WebSocket(`ws://${window.location.hostname}:4080/sync`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to sync server');
      setConnected(true);
      
      try {
        // Send the current document to the server
        const binary = Automerge.save(doc);
        ws.send(binary);
        console.log('Sent initial document to server');
      } catch (error) {
        console.error('Error sending document to server:', error);
      }
    };

    ws.onmessage = (event) => {
      console.log('Received message from server');
      // Check if the data is a Blob or ArrayBuffer
      if (event.data instanceof Blob) {
        // Handle Blob data
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            const binary = new Uint8Array(reader.result as ArrayBuffer);
            setDoc((currentDoc) => {
              try {
                // Clone the current document to make it writable
                const clonedDoc = Automerge.clone(currentDoc);
                // Load the incoming document
                const incomingDoc = Automerge.load<SketchDoc>(binary);
                
                // Validate incoming document structure
                if (!incomingDoc.canvas) {
                  console.warn('Received document without canvas property, adding it');
                  const fixedDoc = Automerge.change(incomingDoc, doc => {
                    doc.canvas = {
                      elements: [],
                      cursors: {},
                      title: 'Untitled Sketch'
                    };
                  });
                  // Merge the fixed document
                  const mergeResult = Automerge.merge<SketchDoc>(clonedDoc, fixedDoc) as unknown as [Automerge.Doc<SketchDoc>, any];
                  console.log('Merged fixed document:', mergeResult[0]);
                  return mergeResult[0];
                }
                
                // Merge the documents with proper type handling
                const mergeResult = Automerge.merge<SketchDoc>(clonedDoc, incomingDoc) as unknown as [Automerge.Doc<SketchDoc>, any];
                console.log('Merged document:', mergeResult[0]);
                return mergeResult[0];
              } catch (e) {
                console.error('Error merging documents:', e);
                return currentDoc;
              }
            });
          }
        };
        reader.onerror = (error) => {
          console.error('FileReader error:', error);
        };
        reader.readAsArrayBuffer(event.data);
      } else if (event.data instanceof ArrayBuffer || ArrayBuffer.isView(event.data)) {
        // Handle ArrayBuffer data directly
        const binary = new Uint8Array(event.data instanceof ArrayBuffer ? event.data : event.data.buffer);
        setDoc((currentDoc) => {
          try {
            // Clone the current document to make it writable
            const clonedDoc = Automerge.clone(currentDoc);
            // Load the incoming document
            const incomingDoc = Automerge.load<SketchDoc>(binary);
            
            // Validate incoming document structure
            if (!incomingDoc.canvas) {
              console.warn('Received document without canvas property, adding it');
              const fixedDoc = Automerge.change(incomingDoc, doc => {
                doc.canvas = {
                  elements: [],
                  cursors: {},
                  title: 'Untitled Sketch'
                };
              });
              // Merge the fixed document
              const mergeResult = Automerge.merge<SketchDoc>(clonedDoc, fixedDoc) as unknown as [Automerge.Doc<SketchDoc>, any];
              console.log('Merged fixed document from ArrayBuffer:', mergeResult[0]);
              return mergeResult[0];
            }
            
            // Merge the documents with proper type handling
            const mergeResult = Automerge.merge<SketchDoc>(clonedDoc, incomingDoc) as unknown as [Automerge.Doc<SketchDoc>, any];
            console.log('Merged document from ArrayBuffer:', mergeResult[0]);
            return mergeResult[0];
          } catch (e) {
            console.error('Error merging documents:', e);
            return currentDoc;
          }
        });
      } else if (typeof event.data === 'string') {
        // Handle string data (could be JSON or other format)
        console.log('Received string data from server:', event.data);
        try {
          // Try to parse as JSON
          const jsonData = JSON.parse(event.data);
          console.log('Parsed JSON data:', jsonData);
          
          // Handle any special messages or commands from the server
          if (jsonData.type === 'error') {
            console.error('Server error:', jsonData.message);
          } else if (jsonData.type === 'info') {
            console.info('Server info:', jsonData.message);
          }
        } catch (e) {
          console.log('String data is not JSON, ignoring');
        }
      } else {
        console.error('Received unknown data type from server');
      }
    };

    ws.onclose = (event) => {
      console.log(`Disconnected from sync server: ${event.code} ${event.reason}`);
      setConnected(false);
      
      // Attempt to reconnect after a delay if not closed cleanly
      if (event.code !== 1000) {
        console.log('Connection closed abnormally, attempting to reconnect in 5 seconds');
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            console.log('Attempting to reconnect...');
            // The next render will create a new connection
            setDoc(currentDoc => currentDoc); // Trigger a re-render
          }
        }, 5000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [doc]);

  // Update cursor position
  const updateCursor = useCallback((x: number, y: number) => {
    if (!doc || !doc.canvas) {
      console.warn('Cannot update cursor: document not initialized');
      return;
    }
    
    setDoc((currentDoc) => {
      try {
        // Clone the document to make it writable
        const clonedDoc = Automerge.clone(currentDoc);
        const newDoc = Automerge.change(clonedDoc, (doc) => {
          if (!doc.canvas) {
            doc.canvas = {
              elements: [],
              cursors: {},
              title: 'Untitled Sketch'
            };
          }
          
          if (!doc.canvas.cursors) {
            doc.canvas.cursors = {};
          }
          
          doc.canvas.cursors[userId] = {
            position: { x, y },
            lastActive: Date.now(),
          };
        });
        
        // Sync cursor changes with other users
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            const binary = Automerge.save(newDoc);
            wsRef.current.send(binary);
          } catch (error) {
            console.error('Error sending cursor update:', error);
          }
        }
        
        return newDoc;
      } catch (error) {
        console.error('Error updating cursor:', error);
        return currentDoc;
      }
    });
  }, [doc, userId]);

  // Add a new stroke
  const addStroke = useCallback((points: Point[], color: string, width: number) => {
    if (!doc || !doc.canvas) {
      console.warn('Cannot add stroke: document not initialized');
      return;
    }
    
    setDoc((currentDoc) => {
      try {
        // Clone the document to make it writable
        const clonedDoc = Automerge.clone(currentDoc);
        const newDoc = Automerge.change(clonedDoc, (doc) => {
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
            id: generateId(),
            type: 'stroke',
            points,
            color,
            width,
            creator: userId,
            timestamp: Date.now(),
          });
        });

        // Sync changes
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            const binary = Automerge.save(newDoc);
            wsRef.current.send(binary);
          } catch (error) {
            console.error('Error sending stroke update:', error);
          }
        }

        return newDoc;
      } catch (error) {
        console.error('Error adding stroke:', error);
        return currentDoc;
      }
    });
  }, [doc, userId]);

  // Add a new note
  const addNote = useCallback((text: string, position: { x: number; y: number }, color: string) => {
    if (!doc || !doc.canvas) {
      console.warn('Cannot add note: document not initialized');
      return;
    }
    
    setDoc((currentDoc) => {
      try {
        // Clone the document to make it writable
        const clonedDoc = Automerge.clone(currentDoc);
        const newDoc = Automerge.change(clonedDoc, (doc) => {
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
            id: generateId(),
            type: 'note',
            text,
            position,
            color,
            creator: userId,
            timestamp: Date.now(),
          });
        });

        // Sync changes
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            const binary = Automerge.save(newDoc);
            wsRef.current.send(binary);
          } catch (error) {
            console.error('Error sending note update:', error);
          }
        }

        return newDoc;
      } catch (error) {
        console.error('Error adding note:', error);
        return currentDoc;
      }
    });
  }, [doc, userId]);

  // Update a note
  const updateNote = useCallback((id: string, text: string) => {
    if (!doc || !doc.canvas) {
      console.warn('Cannot update note: document not initialized');
      return;
    }
    
    setDoc((currentDoc) => {
      try {
        // Clone the document to make it writable
        const clonedDoc = Automerge.clone(currentDoc);
        const newDoc = Automerge.change(clonedDoc, (doc) => {
          if (!doc.canvas || !doc.canvas.elements) return;
          
          const note = doc.canvas.elements.find(
            (el) => el.id === id && el.type === 'note'
          ) as NoteElement;
          
          if (note) {
            note.text = text;
            note.timestamp = Date.now();
          }
        });

        // Sync changes
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            const binary = Automerge.save(newDoc);
            wsRef.current.send(binary);
          } catch (error) {
            console.error('Error sending note update:', error);
          }
        }

        return newDoc;
      } catch (error) {
        console.error('Error updating note:', error);
        return currentDoc;
      }
    });
  }, [doc, userId]);

  // Update the title
  const updateTitle = useCallback((title: string) => {
    if (!doc || !doc.canvas) {
      console.warn('Cannot update title: document not initialized');
      return;
    }
    
    setDoc((currentDoc) => {
      try {
        // Clone the document to make it writable
        const clonedDoc = Automerge.clone(currentDoc);
        const newDoc = Automerge.change(clonedDoc, (doc) => {
          if (!doc.canvas) {
            doc.canvas = {
              elements: [],
              cursors: {},
              title: title
            };
          } else {
            doc.canvas.title = title;
          }
        });

        // Sync changes
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            const binary = Automerge.save(newDoc);
            wsRef.current.send(binary);
          } catch (error) {
            console.error('Error sending title update:', error);
          }
        }

        return newDoc;
      } catch (error) {
        console.error('Error updating title:', error);
        return currentDoc;
      }
    });
  }, [doc]);

  // Reset document to a fresh state
  const resetDocument = useCallback(() => {
    console.log('Resetting document to fresh state');
    try {
      const newDoc = initializeDocument();
      setDoc(newDoc);
      setInitializationAttempts(0);
      setInitializationError(null);
      return true;
    } catch (error) {
      console.error('Error resetting document:', error);
      setInitializationError(`Failed to reset document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [initializeDocument]);

  // Export the canvas as an image
  const exportAsImage = useCallback((): string | null => {
    const canvas = document.getElementById('sketch-canvas') as HTMLCanvasElement;
    if (canvas) {
      return canvas.toDataURL('image/png');
    }
    return null;
  }, []);

  return {
    doc,
    userId,
    connected,
    initializationError,
    updateCursor,
    addStroke,
    addNote,
    updateNote,
    updateTitle,
    resetDocument,
    exportAsImage,
  };
}; 