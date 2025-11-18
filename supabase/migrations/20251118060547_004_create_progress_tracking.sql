/*
  # Student Progress Tracking System

  1. New Tables
    - `session_recordings` - Video/audio recordings of lessons
    - `student_progress` - Track student learning progress
    - `learning_goals` - Goals set by students with tutors
    - `session_notes` - Notes from each tutoring session
    
  2. Security
    - RLS ensures tutors can only access their students' data
    - Students can see their own progress
    - Teachers can see their assigned students
    
  3. Features
    - Support for goals with progress tracking
    - Session notes for documentation
    - Recording metadata and storage paths
*/

-- Session recordings table
CREATE TABLE IF NOT EXISTS session_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recording_url TEXT,
  duration_seconds INTEGER,
  storage_key TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutors can read own recordings"
  ON session_recordings FOR SELECT
  TO authenticated
  USING (tutor_id = auth.uid());

CREATE POLICY "Students can read own recordings"
  ON session_recordings FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Tutors can create recordings"
  ON session_recordings FOR INSERT
  TO authenticated
  WITH CHECK (tutor_id = auth.uid());

-- Learning goals table
CREATE TABLE IF NOT EXISTS learning_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own goals"
  ON learning_goals FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Tutors can read their students goals"
  ON learning_goals FOR SELECT
  TO authenticated
  USING (tutor_id = auth.uid());

CREATE POLICY "Students and tutors can create goals"
  ON learning_goals FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid() OR tutor_id = auth.uid());

CREATE POLICY "Students and tutors can update goals"
  ON learning_goals FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid() OR tutor_id = auth.uid())
  WITH CHECK (student_id = auth.uid() OR tutor_id = auth.uid());

-- Session notes table
CREATE TABLE IF NOT EXISTS session_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  topics_covered TEXT[] DEFAULT '{}',
  homework_assigned TEXT,
  next_focus_areas TEXT[] DEFAULT '{}',
  student_performance_rating INTEGER CHECK (student_performance_rating >= 1 AND student_performance_rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutors can read own notes"
  ON session_notes FOR SELECT
  TO authenticated
  USING (tutor_id = auth.uid());

CREATE POLICY "Students can read own session notes"
  ON session_notes FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Tutors can create notes"
  ON session_notes FOR INSERT
  TO authenticated
  WITH CHECK (tutor_id = auth.uid());

CREATE POLICY "Tutors can update own notes"
  ON session_notes FOR UPDATE
  TO authenticated
  USING (tutor_id = auth.uid())
  WITH CHECK (tutor_id = auth.uid());

-- Student progress metrics
CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  current_level INTEGER,
  target_level INTEGER,
  sessions_completed INTEGER DEFAULT 0,
  total_hours DECIMAL(10,2) DEFAULT 0,
  last_session_date DATE,
  average_performance DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own progress"
  ON student_progress FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Tutors can read their students progress"
  ON student_progress FOR SELECT
  TO authenticated
  USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can update student progress"
  ON student_progress FOR UPDATE
  TO authenticated
  USING (tutor_id = auth.uid())
  WITH CHECK (tutor_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_session_recordings_booking_id ON session_recordings(booking_id);
CREATE INDEX idx_session_recordings_tutor_id ON session_recordings(tutor_id);
CREATE INDEX idx_session_recordings_student_id ON session_recordings(student_id);
CREATE INDEX idx_learning_goals_student_id ON learning_goals(student_id);
CREATE INDEX idx_learning_goals_tutor_id ON learning_goals(tutor_id);
CREATE INDEX idx_learning_goals_status ON learning_goals(status);
CREATE INDEX idx_session_notes_booking_id ON session_notes(booking_id);
CREATE INDEX idx_session_notes_tutor_id ON session_notes(tutor_id);
CREATE INDEX idx_session_notes_student_id ON session_notes(student_id);
CREATE INDEX idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX idx_student_progress_tutor_id ON student_progress(tutor_id);
CREATE INDEX idx_student_progress_subject ON student_progress(subject);
