
import React from 'react';

interface OptionSelectorProps {
    label: string;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    options: string[];
}

export const OptionSelector: React.FC<OptionSelectorProps> = ({ label, value, onChange, options }) => {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
            <select
                value={value}
                onChange={onChange}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 text-gray-200"
            >
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
};
