import React from 'react'

    export default function App() {
      return (
        <div className="min-h-screen bg-gray-100 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-center mb-8">
              Anti-ChatGPT UI
            </h1>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full"></div>
                  <div className="flex-1 bg-gray-200 h-12 rounded-lg"></div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex-1 bg-gray-200 h-12 rounded-lg"></div>
                  <div className="w-12 h-12 bg-blue-500 rounded-full"></div>
                </div>
              </div>
              
              <div className="mt-6">
                <div className="bg-gray-200 h-24 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      )
    }
