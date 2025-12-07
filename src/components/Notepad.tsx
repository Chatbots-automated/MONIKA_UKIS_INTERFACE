import React, { useState, useEffect, useRef } from 'react';
import { X, StickyNote } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface NotepadProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Notepad({ isOpen, onClose }: NotepadProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isOpen && user) {
      loadNote();
    }
  }, [isOpen, user]);

  const loadNote = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('shared_notepad')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading note:', error);
      return;
    }

    if (data) {
      setNoteId(data.id);
      setContent(data.content);
      setLastSaved(new Date(data.updated_at));
    }
  };

  const saveNote = async (newContent: string) => {
    if (!user) return;

    setIsSaving(true);

    try {
      if (noteId) {
        const { error } = await supabase
          .from('shared_notepad')
          .update({
            content: newContent,
            last_edited_by: user.id
          })
          .eq('id', noteId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('shared_notepad')
          .insert({
            content: newContent,
            last_edited_by: user.id
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setNoteId(data.id);
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveNote(newContent);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-yellow-50">
          <div className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Bendros užrašinės</h2>
              <p className="text-xs text-gray-600">Matoma visiems vartotojams</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-hidden">
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Rašykite čia savo užrašus..."
            className="w-full h-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-sm"
          />
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              {isSaving ? (
                <span className="text-amber-600">Išsaugoma...</span>
              ) : lastSaved ? (
                <span>
                  Išsaugota: {lastSaved.toLocaleTimeString('lt-LT', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              ) : (
                <span>Nėra išsaugotų užrašų</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
