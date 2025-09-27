import React from 'react';
import { Spinner } from '@fluentui/react-components';

const Loader = () => {
  return (
    // Дэлгэц бүрхсэн, хагас тунгалаг давхарга (Overlay)
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Бүдэг хар дэвсгэр
        display: 'flex',
        flexDirection: 'column', // Элементүүдийг босоогоор байрлуулах
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000, // Бусад бүх зүйлсийн дээр харагдана
        gap: '16px', // Spinner болон текстийн хоорондох зай
      }}
    >
      {/* Label-гүй Spinner */}
      <Spinner size="huge" />
      {/* Цагаан өнгөтэй текст */}
      <p style={{ margin: 0, color: 'white', fontSize: '16px' }}>Ачааллаж байна...</p>
    </div>
  );
};

export default Loader;
