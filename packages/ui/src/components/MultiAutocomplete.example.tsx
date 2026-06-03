import React, { useState } from 'react';
import { MultiAutocompleteBase } from './MultiAutocomplete';

// Example data structure
interface ExampleItem {
  id: string;
  name: string;
  category: string;
}

// Sample data
const sampleOptions: ExampleItem[] = [
  { id: '1', name: 'Apple', category: 'Fruit' },
  { id: '2', name: 'Banana', category: 'Fruit' },
  { id: '3', name: 'Carrot', category: 'Vegetable' },
  { id: '4', name: 'Tomato', category: 'Vegetable' },
  { id: '5', name: 'Orange', category: 'Fruit' },
  { id: '6', name: 'Lettuce', category: 'Vegetable' },
  { id: '7', name: 'Grape', category: 'Fruit' },
  { id: '8', name: 'Broccoli', category: 'Vegetable' },
];

export const MultiAutocompleteExample: React.FC = () => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [selectedValuesLimited, setSelectedValuesLimited] = useState<string[]>([]);

  return (
    <div className="p-6 space-y-6 max-w-md">
      <h2 className="text-xl font-bold">MultiAutocomplete Examples</h2>
      
      {/* Basic Multi-Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Basic Multi-Selection</h3>
        <MultiAutocompleteBase
          label="Select Fruits and Vegetables"
          placeholder="Choose multiple items..."
          options={sampleOptions}
          searchKey="name"
          idKey="id"
          displayKey="name"
          values={selectedValues}
          onValuesChange={setSelectedValues}
          helperText="Select multiple items from the dropdown"
        />
        <div className="mt-2 text-sm text-gray-600">
          Selected: {selectedValues.join(', ') || 'None'}
        </div>
      </div>

      {/* Limited Selections */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Limited Selections (Max 3)</h3>
        <MultiAutocompleteBase
          label="Select up to 3 items"
          placeholder="Choose up to 3 items..."
          options={sampleOptions}
          searchKey="name"
          idKey="id"
          displayKey="name"
          values={selectedValuesLimited}
          onValuesChange={setSelectedValuesLimited}
          maxSelections={3}
          helperText="You can select maximum 3 items"
        />
        <div className="mt-2 text-sm text-gray-600">
          Selected: {selectedValuesLimited.join(', ') || 'None'}
        </div>
      </div>

      {/* With Error State */}
      <div>
        <h3 className="text-lg font-semibold mb-2">With Error State</h3>
        <MultiAutocompleteBase
          label="Required Selection"
          placeholder="Please select at least one item..."
          options={sampleOptions}
          searchKey="name"
          idKey="id"
          displayKey="name"
          values={[]}
          error={true}
          errorMessage="This field is required"
          helperText="This field shows an error state"
        />
      </div>

      {/* Show Selected Count */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Show Selected Count</h3>
        <MultiAutocompleteBase
          label="Count Display Mode"
          placeholder="Select items to see count..."
          options={sampleOptions}
          searchKey="name"
          idKey="id"
          displayKey="name"
          values={selectedValues}
          onValuesChange={setSelectedValues}
          showSelectedCount={true}
          helperText="This shows the count of selected items instead of names"
        />
      </div>
    </div>
  );
};
