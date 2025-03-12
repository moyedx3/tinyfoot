import React, { useState, useRef, useEffect } from 'react';
import { NoteElement, useSketchStore } from '../stores/sketchStore';

type StickyNoteProps = {
  note: NoteElement;
  externalUpdateNote?: (id: string, text: string) => void;
};

const StickyNote: React.FC<StickyNoteProps> = ({ note, externalUpdateNote }) => {
  const { updateNote: storeUpdateNote } = useSketchStore();
  
  // Use external updateNote if provided, otherwise use the one from the store
  const updateNote = externalUpdateNote || storeUpdateNote;
  
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== note.text) {
      updateNote(note.id, text);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
      updateNote(note.id, text);
    }
  };

  // Generate a random rotation between -5 and 5 degrees based on the note ID
  const getRotation = () => {
    // Use the note ID to generate a consistent rotation
    const seed = note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (seed % 10) - 5;
  };

  return (
    <div
      className="sticky-note"
      style={{
        position: 'absolute',
        left: `${note.position.x}px`,
        top: `${note.position.y}px`,
        backgroundColor: note.color,
        transform: `rotate(${getRotation()}deg)`,
        padding: '15px',
        minWidth: '150px',
        minHeight: '150px',
        boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.3)',
        border: '1px solid #ccc',
        fontFamily: '"Comic Sans MS", cursive, sans-serif',
        zIndex: 100,
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            fontSize: '14px',
            outline: 'none',
          }}
        />
      ) : (
        <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{text}</div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: '5px',
          right: '5px',
          fontSize: '10px',
          color: '#666',
        }}
      >
        {new Date(note.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default StickyNote; 