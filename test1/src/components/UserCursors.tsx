import React, { useEffect } from 'react';
import { useSketchStore } from '../stores/sketchStore';

type UserCursorsProps = {
  currentUserId: string;
};

const UserCursors: React.FC<UserCursorsProps> = ({ currentUserId }) => {
  const { doc } = useSketchStore();
  
  // Add debugging to see if cursors are being tracked
  useEffect(() => {
    if (!doc || !doc.canvas) return;
    
    console.log('Current cursors:', doc.canvas.cursors);
    
    // Debug message to help troubleshoot
    if (Object.keys(doc.canvas.cursors).length > 0) {
      console.log('Cursor data available!');
      Object.entries(doc.canvas.cursors).forEach(([userId, cursor]) => {
        console.log(`User ${userId}: x=${cursor.position.x}, y=${cursor.position.y}, lastActive=${new Date(cursor.lastActive).toISOString()}`);
      });
    } else {
      console.log('No cursor data available yet');
    }
  }, [doc?.canvas?.cursors]);
  
  // Check if doc is properly initialized - AFTER all hooks
  if (!doc || !doc.canvas) {
    console.error('Document not properly initialized in UserCursors:', doc);
    return null;
  }
  
  // Filter out the current user's cursor and get other users' cursors
  const otherUserCursors = Object.entries(doc.canvas.cursors)
    .filter(([userId]) => userId !== currentUserId);
  
  // Only show cursors that have been active in the last 10 seconds
  const activeCursors = otherUserCursors.filter(([_, cursor]) => {
    return Date.now() - cursor.lastActive < 10000;
  });

  // Log active cursors for debugging
  console.log('Active cursors:', activeCursors.length);

  return (
    <>
      {activeCursors.map(([userId, cursor]) => (
        <div
          key={userId}
          style={{
            position: 'absolute',
            left: `${cursor.position.x}px`,
            top: `${cursor.position.y}px`,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          {/* Classic Windows 98/2000 cursor with enhanced visibility */}
          <div style={{
            width: '24px',
            height: '24px',
            backgroundImage: `url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH5gMQDxAQXss8vQAAA8BJREFUWMPtl11IU2EYx//nnG1+ZJtOZ5tuaAqCRF8GQUQUdBFdRBB0E91FN3VRQXQRQQTRRQTRRQQVFBREFxFUF9FFBF1EH0QQQUhgZWmamjrndra9p4vN6XSbc3MQQf+L8573fc/5/57n+T/Pc4AAAwwwwH8KMdvEaDSKZDKJbDYLURRBKQUhBIQQEEIgCAIEQYAoihAEYdbcswKIRCKIRqMQRRGCIECSJMiyDFmWIUkSJEmCKIpgGAaMMWQyGWQyGaRSKSSTSSSTSaRSKaRSKaRSKWQyGTDG5gYQiUQQj8chyzJkWYYkSRBFEYIggOd58DwPjuMgCAJYlgXDMGBZFoQQEEJAKQUhBJRSUEqRz+eRz+eRy+WQy+WQzWaRzWaRyWTAGJsZIBwOIx6PQ1EUKIoCWZYhiiJ4ngfHceA4DizLgmVZMAzzx2FZFgzDgGEYUEpBCAGlFJRSFAoFFAoF5PN55HI5ZLNZpNNppNNppFIpJBIJxONxRKNRRKNRRCIRRCIRhMNhhMNhRCIRxGIxxGIxxGIxxONxJBIJJBIJJJNJpFIppNNpZDIZZLNZZLNZ5HI55HI55PN5FAoFFAoF5PP5PwHC4TBisRji8ThisRji8TgSiQSSySRSqRTS6TTS6TQymQyy2SxyuRxyuRzy+TwKhQIKhQIYYygWiygWi2CMoVgsgjGGYrGIUqmEUqmEcrmMcrmMSqWCSqWCWq2GWq2Ger2Oer2ORqOBRqOBZrOJZrOJVquFVquFdruNdruNTqeDTqeDbreLbrebB4BwOIxoNIpIJIJwOIxQKIRgMAi/3w+fzwePxwO32w2XywWn0wmHwwG73Q6bzQar1QqLxQKz2QyTyQSj0QiDwQC9Xg+dTgedTge9Xg+9Xg+DwQCj0QiTyQSz2QyLxQKr1Qqbzfb7OJ1OuFwuuN1ueL1e+Hw++P1+BAIBBINBhEIhhMNhRCIRRKNRxGKxHEDvCvQWUO8KJJNJpFIppNNpZDIZZLNZ5HI55HI55PN5FAoFFAoFFItFFItFlEollEollMtllMtlVCoVVCoVVKtVVKtV1Go11Go11Ot11Ot1NBqNqQF6e6C3iHp7IJlMIpVKIZ1OI5PJIJvNIpfLIZ/Po1AooFgsolQqoVwuo1KpoFqtolarodFooNlsotVqod1uo9PpoNvtYjAYYDAYYDgcYjgcYjQaYTQaYTweYzweYzKZYDKZYDKZYDqdYjqdYjabYTabYT6fYz6fYz6fYzabYTqdYjKZYDweYzQaYTgcYjAYoN/vo9/vo9froded0Wg0/vkr+QUlFWuI6hRYBwAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMi0wMy0xNlQxNToxNjoxNiswMDowMHRNRyQAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjItMDMtMTZUMTU6MTY6MTYrMDA6MDAFEPuYAAAAAElFTkSuQmCC')`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            transform: 'rotate(-15deg)',
            animation: 'cursorPulse 1.5s infinite',
            filter: 'drop-shadow(0 0 3px rgba(255, 255, 0, 0.7))',
          }} />
          
          {/* User identifier */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '10px',
            backgroundColor: '#ffff99',
            border: '1px solid #000080',
            padding: '2px 5px',
            fontSize: '10px',
            fontFamily: '"MS Sans Serif", Arial, sans-serif',
            whiteSpace: 'nowrap',
            boxShadow: '2px 2px 0 #808080',
          }}>
            User {userId.substring(0, 4)}
          </div>
        </div>
      ))}
    </>
  );
};

export default UserCursors; 