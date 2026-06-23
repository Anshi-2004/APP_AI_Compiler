import React from 'react';

export default function HomePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Home Page</h1>
      <p className="text-gray-500">Route path: /</p>
      <p className="text-gray-400">Accessible to: admin, user</p>
    </div>
  );
}
