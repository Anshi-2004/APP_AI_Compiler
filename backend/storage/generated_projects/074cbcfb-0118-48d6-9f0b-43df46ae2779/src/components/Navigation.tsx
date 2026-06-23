import React from 'react';
import { Link } from 'react-router-dom';

const items = [{ name: 'Home Page', path: '/' }];

export default function Navigation() {
  return (
    <nav className="flex gap-4 p-4 border-b">
      {items.map(item => (
        <Link key={item.path} to={item.path} className="text-blue-500 hover:underline">
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
