import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Student, SECTION_MAPPINGS } from '@/lib/types';
import { getProgramName } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StudentFormProps {
  student?: Student | null;
  sections: string[];
  onSubmit: (student: Student | Omit<Student, 'id'>) => void;
  onCancel: () => void;
}

export default function StudentForm({ student, sections, onSubmit, onCancel }: StudentFormProps) {
  const [formData, setFormData] = useState({ name: '', usn: '', section: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (student) {
      setFormData({ name: student.name, usn: student.usn, section: student.section });
    }
  }, [student]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.usn.trim()) {
      newErrors.usn = 'USN is required';
    } else if (!/^[0-9]{2}[A-Z]{2,3}[0-9]{2,3}$/.test(formData.usn.toUpperCase())) {
      newErrors.usn = 'USN format should be like 22CS001';
    }

    if (!formData.section) {
      newErrors.section = 'Section is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const studentData = student
      ? { ...student, ...formData }
      : { ...formData };

    onSubmit(studentData);
  };

  const handleInputChange = (field: string, value: string) => {
    // Prevent overriding section if it's being set to empty during initialization
    if (field === 'section' && value === '' && formData.section !== '') {
      return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card variant="cyber" className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-cyber-gray-900">
            {student ? 'Edit Student' : 'Add New Student'}
          </h2>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cyber-gray-700 mb-1">
              Full Name *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter student's full name"
              className={errors.name ? 'border-red-300 focus:border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-cyber-gray-700 mb-1">
              Application Number *
            </label>
            <Input
              type="text"
              value={formData.usn}
              onChange={(e) => handleInputChange('usn', e.target.value.toUpperCase())}
              placeholder="e.g., 22CS001"
              className={errors.usn ? 'border-red-300 focus:border-red-500' : ''}
            />
            {errors.usn && (<p className="text-red-600 text-sm mt-1">{errors.usn}</p>)}
          </div>

          <div>
            <label className="block text-sm font-medium text-cyber-gray-700 mb-1">
              Section *
            </label>
            <Select
              key={student?.id || 'new'}
              value={formData.section}
              onValueChange={(value) => handleInputChange('section', value)}
            >
              <SelectTrigger className={errors.section ? 'border-red-300 focus:border-red-500' : ''}>
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section} value={section}>
                    {section} - {getProgramName(section)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.section && (
              <p className="text-red-600 text-sm mt-1">{errors.section}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {student ? 'Update Student' : 'Add Student'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}