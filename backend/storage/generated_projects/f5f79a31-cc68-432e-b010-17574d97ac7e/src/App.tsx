import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path='/' element=< HomePage /> />
      </Routes>
    </BrowserRouter>
  );
}
