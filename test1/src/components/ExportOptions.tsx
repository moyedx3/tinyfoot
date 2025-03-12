import React, { useState } from 'react';
import { useSketchStore } from '../stores/sketchStore';

const ExportOptions: React.FC = () => {
  const { exportAsImage, doc } = useSketchStore();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const handleExport = () => {
    const imageUrl = exportAsImage();
    if (imageUrl) {
      setExportUrl(imageUrl);
      setShowExportDialog(true);
    }
  };

  const handleCloseDialog = () => {
    setShowExportDialog(false);
    setExportUrl(null);
  };

  const handleDownload = () => {
    if (!exportUrl) return;
    
    // Create a download link
    const link = document.createElement('a');
    link.href = exportUrl;
    link.download = `${doc.canvas.title || 'untitled-sketch'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    handleCloseDialog();
  };

  const handleCopyLink = () => {
    if (!exportUrl) return;
    
    // In a real app, you would upload the image to a server and get a shareable link
    // For this demo, we'll just copy the data URL to clipboard
    navigator.clipboard.writeText(exportUrl)
      .then(() => {
        alert('Image URL copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy URL: ', err);
      });
  };

  return (
    <div className="export-options">
      <button
        onClick={handleExport}
        style={{
          backgroundColor: '#c0c0c0',
          border: '2px outset #c0c0c0',
          padding: '3px 10px',
          fontFamily: '"MS Sans Serif", Arial, sans-serif',
          cursor: 'pointer',
          fontWeight: 'bold',
          marginRight: '10px',
        }}
      >
        Export Sketch
      </button>

      {showExportDialog && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            backgroundColor: '#c0c0c0',
            border: '2px solid #000080',
            boxShadow: '5px 5px 0 #808080',
            padding: '2px',
            width: '400px',
          }}
        >
          <div
            style={{
              backgroundColor: '#000080',
              color: 'white',
              padding: '2px 5px',
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Export Sketch</span>
            <span
              style={{ cursor: 'pointer' }}
              onClick={handleCloseDialog}
            >
              ×
            </span>
          </div>
          
          <div style={{ padding: '15px' }}>
            <div style={{ marginBottom: '15px', textAlign: 'center' }}>
              {exportUrl && (
                <img
                  src={exportUrl}
                  alt="Exported sketch"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    border: '1px solid #000',
                  }}
                />
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={handleDownload}
                style={{
                  backgroundColor: '#c0c0c0',
                  border: '2px outset #c0c0c0',
                  padding: '3px 10px',
                  fontFamily: '"MS Sans Serif", Arial, sans-serif',
                  cursor: 'pointer',
                }}
              >
                Download
              </button>
              
              <button
                onClick={handleCopyLink}
                style={{
                  backgroundColor: '#c0c0c0',
                  border: '2px outset #c0c0c0',
                  padding: '3px 10px',
                  fontFamily: '"MS Sans Serif", Arial, sans-serif',
                  cursor: 'pointer',
                }}
              >
                Copy Link
              </button>
              
              <button
                onClick={handleCloseDialog}
                style={{
                  backgroundColor: '#c0c0c0',
                  border: '2px outset #c0c0c0',
                  padding: '3px 10px',
                  fontFamily: '"MS Sans Serif", Arial, sans-serif',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportOptions; 