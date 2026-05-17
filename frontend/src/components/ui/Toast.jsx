import React from 'react';

const Toast = ({ message, type, visible }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '80px', // above the queue drawer tab
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '20px'})`,
      opacity: visible ? 1 : 0,
      transition: 'all 0.25s ease',
      zIndex: 99998,
      background: type === 'success' ? '#ffe45e' : '#ff499e',
      border: '2px solid black',
      boxShadow: '4px 4px 0px #000',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      minWidth: '280px',
      maxWidth: '400px',
      pointerEvents: 'none'
    }}>
      {/* Icon */}
      <div style={{
        width: '24px',
        height: '24px',
        background: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
          {type === 'success' ? '✓' : '!'}
        </span>
      </div>
      {/* Message */}
      <span style={{
        fontWeight: 'bold',
        fontSize: '13px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: 'black'
      }}>
        {message}
      </span>
    </div>
  );
};

export default Toast;
