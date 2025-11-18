/*
  # Tutor Availability Calendar System

  1. New Tables
    - `tutor_availability` - Recurring weekly availability slots
    - `tutor_unavailable_dates` - Block out specific dates/times
    
  2. Security
    - RLS ensures tutors can only manage their own availability
    - Students can view tutor availability
    
  3. Features
    - Support for recurring weekly schedules
    - Ability to block out dates for vacation/busy times
    - Time zone aware (stored as UTC, converted on client)
*/

-- Tutor recurring availability (e.g., "Every Monday 2-5pm")
CREATE TABLE IF NOT EXISTS tutor_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

ALTER TABLE tutor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutors can read own availability"
  ON tutor_availability FOR SELECT
  TO authenticated
  USING (tutor_id = auth.uid());

CREATE POLICY "Public can view active tutor availability"
  ON tutor_availability FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Tutors can manage own availability"
  ON tutor_availability FOR INSERT
  TO authenticated
  WITH CHECK (tutor_id = auth.uid());

CREATE POLICY "Tutors can update own availability"
  ON tutor_availability FOR UPDATE
  TO authenticated
  USING (tutor_id = auth.uid())
  WITH CHECK (tutor_id = auth.uid());

CREATE POLICY "Tutors can delete own availability"
  ON tutor_availability FOR DELETE
  TO authenticated
  USING (tutor_id = auth.uid());

-- Tutor unavailable dates (for vacations, emergencies, etc.)
CREATE TABLE IF NOT EXISTS tutor_unavailable_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (start_at < end_at)
);

ALTER TABLE tutor_unavailable_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutors can read own unavailable dates"
  ON tutor_unavailable_dates FOR SELECT
  TO authenticated
  USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can manage own unavailable dates"
  ON tutor_unavailable_dates FOR INSERT
  TO authenticated
  WITH CHECK (tutor_id = auth.uid());

CREATE POLICY "Tutors can update own unavailable dates"
  ON tutor_unavailable_dates FOR UPDATE
  TO authenticated
  USING (tutor_id = auth.uid())
  WITH CHECK (tutor_id = auth.uid());

CREATE POLICY "Tutors can delete own unavailable dates"
  ON tutor_unavailable_dates FOR DELETE
  TO authenticated
  USING (tutor_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_tutor_availability_tutor_id ON tutor_availability(tutor_id);
CREATE INDEX idx_tutor_availability_day ON tutor_availability(day_of_week);
CREATE INDEX idx_tutor_unavailable_tutor_id ON tutor_unavailable_dates(tutor_id);
CREATE INDEX idx_tutor_unavailable_dates ON tutor_unavailable_dates(start_at, end_at);
