'use client';

import { Button } from '@/components/ui/button';
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SESSION_OPTIONS, SessionOption } from '@/lib/types';
import { getSessionLabel } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ConfigureSessionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: Date;
  initialSession: SessionOption;
  isNewSession: boolean; // true = starting new session, false = updating existing
  onConfirm: (date: Date, session: SessionOption) => void;
}

export default function ConfigureSessionDialog({
  isOpen,
  onOpenChange,
  initialDate,
  initialSession,
  isNewSession,
  onConfirm
}: ConfigureSessionDialogProps) {
  // Local state for dialog values (only applied on confirm)
  const [tempDate, setTempDate] = useState<Date>(initialDate);
  const [tempSession, setTempSession] = useState<SessionOption>(initialSession);

  // Reset to initial values when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setTempDate(initialDate);
      setTempSession(initialSession);
    }
  }, [isOpen, initialDate, initialSession]);

  const handleConfirm = () => {
    onConfirm(tempDate, tempSession);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset to initial values and close
    setTempDate(initialDate);
    setTempSession(initialSession);
    onOpenChange(false);
  };

  const buttonText = isNewSession ? "Start Session" : "Update Configuration";
  const dialogTitle = isNewSession ? "Start New Attendance Session" : "Update Session Configuration";
  const dialogDescription = isNewSession 
    ? "Select the date and time slot for your new attendance session."
    : "Update the date and time for this attendance session.";

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 md:space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <DatePicker
              date={tempDate}
              onDateChange={(date) => date && setTempDate(date as Date)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Session Time</label>
            <Select 
              value={tempSession} 
              onValueChange={(value: SessionOption) => setTempSession(value)}
            >
              <SelectTrigger>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Select session time" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {SESSION_OPTIONS.map(option => (
                  <SelectItem key={option.key} value={option.key}>
                    {getSessionLabel(option.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              glow
              onClick={handleConfirm}
              className="flex-1"
            >
              {buttonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
