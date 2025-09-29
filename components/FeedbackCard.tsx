'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { FirebaseService } from '@/lib/firebase-service';
import { Feedback } from '@/lib/types';
import { format } from 'date-fns';
import {
  Archive,
  ArrowLeft,
  CheckCircle,
  Clock,
  Edit3,
  History,
  MessageSquare,
  Plus,
  Send,
  User,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface FeedbackCardProps {
  isAdminView?: boolean;
}

const statusIcons = {
  open: <Clock className="w-4 h-4" />,
  in_progress: <Edit3 className="w-4 h-4" />,
  resolved: <CheckCircle className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
  closed: <Archive className="w-4 h-4" />
};

const statusColors = {
  open: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200'
};

const categoryLabels = {
  bug: '🐛 Bug Report',
  feature: '✨ Feature Request',
  improvement: '💡 Improvement',
  question: '❓ Question',
  complaint: '😞 Complaint',
  other: '💬 Other',
};

export default function FeedbackCard({ isAdminView = false }: FeedbackCardProps) {
  const { user, isAdmin } = useAuth();
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<'write' | 'history' | 'view'>('write');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<Feedback['category']>('other');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Feedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [adminStatus, setAdminStatus] = useState<Feedback['status']>('open');
  const [userEditMode, setUserEditMode] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [editedCategory, setEditedCategory] = useState<Feedback['category']>('other');

  isAdminView = user?.email === '22btrca061@jainuniversity.ac.in' || false;

  const loadHistory = async () => {
    try {
      setLoading(true);
      const items = await FirebaseService.getFeedbacks({
        author: isAdminView ? undefined : user?.email,
        limit: 100
      }) as Feedback[];
      setHistory(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'history') loadHistory();
  }, [mode, isAdminView, user?.email]);

  const handleSubmit = async () => {
    if (!text.trim() || !user?.email) return;
    try {
      setLoading(true);
      await FirebaseService.saveFeedback({
        text: text.trim(),
        author: user.email,
        category
      });
      setText('');
      setCategory('other');
      setMode('history');
      await loadHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackClick = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setAdminResponse(feedback.response || '');
    setAdminStatus(feedback.status);
    setUserEditMode(false);
    setEditedText(feedback.text);
    setEditedCategory(feedback.category);
    setMode('view');
  };

  const handleAdminUpdate = async () => {
    if (!selectedFeedback || !isAdmin) return;
    try {
      setLoading(true);
      await FirebaseService.updateFeedback(selectedFeedback.id, {
        status: adminStatus,
        response: adminResponse || undefined,
        responder: user?.email
      });
      await loadHistory();
      setMode('history');
      setSelectedFeedback(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = async () => {
    if (!selectedFeedback || selectedFeedback.author !== user?.email) return;
    try {
      setLoading(true);
      await FirebaseService.updateFeedback(selectedFeedback.id, { text: editedText.trim(), category: editedCategory });
      await loadHistory();
      setUserEditMode(false);
      // Update the selected feedback with new values
      setSelectedFeedback({ ...selectedFeedback, text: editedText.trim(), category: editedCategory });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (mode === 'view') {
      setMode('history');
      setSelectedFeedback(null);
    } else {
      setMode('write');
    }
  };

  return (
    <Card variant="glass" className="p-3 md:p-6 border-2 border-dashed border-cyber-yellow/30 hover:border-cyber-yellow/60 transition-colors">
      {/* Minimized Header */}
      {!show ? (
        <div
          onClick={() => {
            setShow(true);
            setMode('write'); // Reset to write mode when expanding
          }}
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-cyber-yellow" />
            <h3 className="text-sm md:text-xl font-bold text-cyber-gray-900 group-hover:text-cyber-yellow transition-colors">
              Feedback
            </h3>
          </div>
          <div className="text-xs text-cyber-gray-500 group-hover:text-cyber-gray-700 transition-colors">
            Click to expand
          </div>
        </div>
      ) : (
        <>
          {/* Full Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {mode !== 'write' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  className="p-1 h-8 w-8"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-cyber-yellow" />
                <h3 className="text-sm md:text-xl font-bold text-cyber-gray-900">
                  {mode === 'write' ? 'Send Feedback' :
                    mode === 'history' ? 'Feedback History' :
                      'Feedback Details'}
                </h3>
              </div>
            </div>

            {mode === 'write' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('history')}
                className="flex items-center gap-2 text-cyber-gray-600 hover:text-cyber-gray-900"
              >
                <History className="w-4 h-4" />
                History
              </Button>
            )}
          </div>

          {/* Write Mode */}
          {mode === 'write' && (
            <div className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-cyber-gray-700 mb-2">
                  Your Feedback
                </label>
                <textarea
                  value={text}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
                  placeholder="Describe your issue, suggestion, or question in detail..."
                  rows={4}
                  className="w-full px-3 py-3 border border-cyber-gray-200 rounded-lg text-sm resize-vertical focus:ring-2 focus:ring-cyber-yellow focus:border-cyber-yellow bg-inherit"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !text.trim()}
                  className="px-8 bg-cyber-yellow hover:bg-cyber-yellow-dark text-cyber-gray-900 font-medium"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cyber-gray-900/30 border-t-cyber-gray-900 rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* History Mode */}
          {mode === 'history' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-cyber-yellow/30 border-t-cyber-yellow rounded-full animate-spin" />
                    <span className="text-sm text-cyber-gray-600">Loading past feedbacks...</span>
                  </div>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-cyber-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-cyber-gray-900 mb-2">No feedback yet</p>
                  <p className="text-sm text-cyber-gray-600 mb-4">
                    {isAdminView ? 'No feedback has been submitted yet.' : 'You haven\'t submitted any feedback yet.'}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setMode('write')}
                    className="bg-cyber-yellow/10 border-cyber-yellow text-cyber-gray-900 hover:bg-cyber-yellow/20"
                  >
                    Write First Feedback
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-cyber-gray-600">
                      {history.length} feedback{history.length !== 1 ? 's' : ''} found
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMode('write')}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      New Feedback
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {history.map((feedback) => (
                      <div
                        key={feedback.id}
                        onClick={() => handleFeedbackClick(feedback)}
                        className="p-4 border border-cyber-gray-200 rounded-lg hover:border-cyber-yellow/50 hover:bg-cyber-gray-50/50 cursor-pointer transition-all duration-200 group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs font-medium text-cyber-gray-400 uppercase tracking-wide">
                            {categoryLabels[feedback.category]}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusColors[feedback.status]}`}>
                              {statusIcons[feedback.status]}
                              {feedback.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-cyber-gray-900 mb-3 line-clamp-2 group-hover:line-clamp-none transition-all">
                          {feedback.text}
                        </p>

                        <div className="flex items-center justify-between text-xs text-cyber-gray-500">
                          {isAdminView && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {feedback.author}
                            </div>
                          )}
                          <span>
                            {format(new Date(feedback.createdAt), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* View Mode */}
          {mode === 'view' && selectedFeedback && (
            <div className="space-y-6">
              {/* Feedback Details */}
              <div className="bg-cyber-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-cyber-gray-700 uppercase tracking-wide">
                    {categoryLabels[selectedFeedback.category]}
                  </span>
                  <div className="flex-1" />
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusColors[selectedFeedback.status]} self-end`}>
                    {statusIcons[selectedFeedback.status]}
                    {selectedFeedback.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-cyber-gray-900 mb-3 whitespace-pre-line">{selectedFeedback.text}</p>

                <div className="flex items-center justify-between text-xs text-cyber-gray-500">
                  <span>By {selectedFeedback.author}</span>
                  <span>{format(new Date(selectedFeedback.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              </div>

              {/* Response Section */}
              {selectedFeedback.response && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Response</span>
                    {selectedFeedback.responder && isAdminView && (
                      <span className="text-xs text-green-600">by {selectedFeedback.responder}</span>
                    )}
                  </div>
                  <div className="text-green-900 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: selectedFeedback.response }} />
                  {selectedFeedback.resolvedAt && (
                    <p className="text-xs text-green-600 mt-2">
                      Resolved on {format(new Date(selectedFeedback.resolvedAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  )}
                </div>
              )}

              {/* User Controls - Edit own feedback */}
              {selectedFeedback.author === user?.email && ['open', 'in_progress'].includes(selectedFeedback.status) && (
                <div className="border-t border-cyber-gray-200">
                  {!userEditMode ? (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setUserEditMode(true)}
                        className="flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit Feedback
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-cyber-gray-700 mb-2">Update your feedback</label>
                        <textarea
                          value={editedText}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedText(e.target.value)}
                          placeholder="Update your feedback..."
                          rows={3}
                          className="w-full px-3 py-2 border border-cyber-gray-200 rounded-lg text-sm resize-vertical focus:ring-2 focus:ring-cyber-yellow focus:border-cyber-yellow"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Select
                          value={editedCategory}
                          onValueChange={(value: any) => setEditedCategory(value)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          onClick={() => {
                            setUserEditMode(false);
                            setEditedText(selectedFeedback.text);
                            setEditedCategory(selectedFeedback.category);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleUserUpdate}
                          disabled={loading || !editedText.trim()}
                          className="bg-cyber-yellow hover:bg-cyber-yellow-dark text-cyber-gray-900 font-medium px-6"
                        >
                          {loading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-cyber-gray-900/30 border-t-cyber-gray-900 rounded-full animate-spin" />
                              Updating...
                            </>
                          ) : (
                            'Update'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Controls */}
              {isAdminView && (
                <div className="border-t border-cyber-gray-200 pt-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-cyber-gray-700 mb-2">Admin Response</label>
                      <textarea
                        value={adminResponse}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminResponse(e.target.value)}
                        placeholder="Provide a response to this feedback..."
                        rows={3}
                        className="w-full px-3 py-2 border border-cyber-gray-200 rounded-lg text-sm resize-vertical focus:ring-2 focus:ring-cyber-yellow focus:border-cyber-yellow"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Select
                        value={adminStatus}
                        onValueChange={(value: any) => setAdminStatus(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        onClick={handleAdminUpdate}
                        disabled={loading}
                        className="bg-cyber-yellow hover:bg-cyber-yellow-dark text-cyber-gray-900 font-medium px-8"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-cyber-gray-900/30 border-t-cyber-gray-900 rounded-full animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Feedback'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
