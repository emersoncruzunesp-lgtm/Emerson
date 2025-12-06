import React from 'react';
import { IActivity } from '../types';
import { Check, Trash2, Tag } from 'lucide-react';

interface ActivityItemProps {
  activity: IActivity;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity, onToggle, onDelete }) => {
  return (
    <div className={`group flex items-center p-4 mb-3 bg-white rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md ${activity.completed ? 'opacity-75' : ''}`}>
      <button
        onClick={() => onToggle(activity.id)}
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mr-4 ${
          activity.completed 
            ? 'bg-green-500 border-green-500' 
            : 'border-gray-300 hover:border-green-500'
        }`}
      >
        {activity.completed && <Check size={14} className="text-white" />}
      </button>
      
      <div className="flex-grow">
        <h3 className={`font-medium text-gray-800 ${activity.completed ? 'line-through text-gray-400' : ''}`}>
          {activity.title}
        </h3>
        <div className="flex items-center mt-1 space-x-2">
          <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 bg-gray-100 text-gray-800">
            <Tag size={10} />
            {activity.tag}
          </span>
        </div>
      </div>

      <button 
        onClick={() => onDelete(activity.id)}
        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
        aria-label="Excluir atividade"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};