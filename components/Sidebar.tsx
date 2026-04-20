
import React from 'react';
import { Room } from '../types';

interface SidebarProps {
  rooms: Room[];
}

const Sidebar: React.FC<SidebarProps> = ({ rooms }) => {
  return (
    <div className="flex flex-col border-r border-gray-200 no-select bg-white z-20 shadow-sm w-72">
      {/* Header cell matching the grid timeline */}
      <div className="h-[75px] border-b border-gray-200 bg-gray-50 flex items-end p-4">
        <h3 className="text-xs font-bold text-[#003580] uppercase tracking-wider">Tus Unidades</h3>
      </div>

      {/* Room Labels */}
      <div className="flex-1 overflow-hidden">
        {rooms.map((room) => (
          <div key={room.id} className="flex h-12 border-b border-gray-100 group hover:bg-gray-50 transition-colors">
            {/* Category Indicator Dot */}
            <div className={`w-1.5 ${room.category === 'Marina' ? 'bg-blue-400' : room.category === 'Triplex' ? 'bg-purple-400' : 'bg-green-400'}`}></div>

            {/* Room Number Circle */}
            <div className="w-12 flex items-center justify-center">
               <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 border border-gray-200 group-hover:border-[#003580] group-hover:text-[#003580] transition-all">
                {room.number}
               </div>
            </div>

            {/* Room Info */}
            <div className="flex-1 pr-3 flex flex-col justify-center truncate">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-gray-800 truncate">{room.description}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[9px] text-gray-400 font-medium px-1.5 py-0.5 bg-gray-100 rounded uppercase">{room.category}</span>
                <span className="text-[9px] text-gray-500 italic">{room.capacity}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
