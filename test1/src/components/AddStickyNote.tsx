import React, { useState } from 'react';
import { useSketchStore } from '../stores/sketchStore';

type AddStickyNoteProps = {
  canvasWidth: number;
  canvasHeight: number;
  externalAddNote?: (text: string, position: { x: number; y: number }, color: string) => void;
};

const AddStickyNote: React.FC<AddStickyNoteProps> = ({ 
  canvasWidth, 
  canvasHeight,
  externalAddNote
}) => {
  const { addNote: storeAddNote } = useSketchStore();
  
  // Use external addNote if provided, otherwise use the one from the store
  const addNote = externalAddNote || storeAddNote;
  
  const [noteText, setNoteText] = useState('');
  const [noteColor, setNoteColor] = useState('#ffff88');

  // Array of classic sticky note colors
  const noteColors = [
    '#ffff88', // yellow
    '#ff7eb9', // pink
    '#7afcff', // blue
    '#90ee90', // green
    '#ffa07a', // light salmon
  ];

  const handleAddNote = () => {
    if (noteText.trim() === '') return;

    // Generate a random position within the canvas
    const x = Math.random() * (canvasWidth - 200) + 50;
    const y = Math.random() * (canvasHeight - 200) + 50;

    addNote(noteText, { x, y }, noteColor);
    setNoteText('');
  };

  return (
    <div className="add-sticky-note" style={{ marginBottom: '20px' }}>
      <div style={{ 
        border: '2px solid #000080',
        backgroundColor: '#c0c0c0',
        padding: '10px',
        fontFamily: '"MS Sans Serif", Arial, sans-serif',
        boxShadow: '3px 3px 0 #808080',
      }}>
        <div style={{ 
          backgroundColor: '#000080', 
          color: 'white', 
          padding: '2px 5px',
          marginBottom: '10px',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>Add New Sticky Note</span>
          <span>×</span>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type your note here..."
            style={{
              width: '100%',
              height: '80px',
              fontFamily: '"MS Sans Serif", Arial, sans-serif',
              fontSize: '14px',
              border: '2px inset #c0c0c0',
              backgroundColor: 'white',
              padding: '5px',
            }}
          />
        </div>
        
        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '10px' }}>Color:</span>
          <div style={{ display: 'flex', gap: '5px' }}>
            {noteColors.map((color) => (
              <div
                key={color}
                onClick={() => setNoteColor(color)}
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: color,
                  border: color === noteColor ? '2px solid black' : '1px solid #666',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
        
        <button
          onClick={handleAddNote}
          style={{
            backgroundColor: '#c0c0c0',
            border: '2px outset #c0c0c0',
            padding: '3px 10px',
            fontFamily: '"MS Sans Serif", Arial, sans-serif',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Add Note
        </button>
      </div>
    </div>
  );
};

export default AddStickyNote; 