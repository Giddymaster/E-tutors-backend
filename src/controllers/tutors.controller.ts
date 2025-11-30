import { Request, Response } from 'express';
import { TutorProfile } from '../models/tutor.model';
import { User } from '../models/user.model';

// Onboard a new tutor
export const onboardTutor = async (req: Request, res: Response) => {
    try {
        const { userId, shortBio, hourlyRate, availability } = req.body;
        const tutorProfile = new TutorProfile({ user_id: userId, short_bio: shortBio, hourly_rate: hourlyRate, availability });
        await tutorProfile.save();
        res.status(201).json({ message: 'Tutor onboarded successfully', tutorProfile });
    } catch (error) {
        res.status(500).json({ message: 'Error onboarding tutor', error });
    }
};

// Update tutor profile
export const updateTutorProfile = async (req: Request, res: Response) => {
    try {
        const { tutorId } = req.params;
        const updates = req.body;
        const updatedProfile = await TutorProfile.findByIdAndUpdate(tutorId, updates, { new: true });
        if (!updatedProfile) {
            return res.status(404).json({ message: 'Tutor not found' });
        }
        res.status(200).json({ message: 'Tutor profile updated successfully', updatedProfile });
    } catch (error) {
        res.status(500).json({ message: 'Error updating tutor profile', error });
    }
};

// Get tutor profile
export const getTutorProfile = async (req: Request, res: Response) => {
    try {
        const { tutorId } = req.params;
        const tutorProfile = await TutorProfile.findById(tutorId).populate('user_id');
        if (!tutorProfile) {
            return res.status(404).json({ message: 'Tutor not found' });
        }
        res.status(200).json(tutorProfile);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tutor profile', error });
    }
};

// Set tutor availability
export const setTutorAvailability = async (req: Request, res: Response) => {
    try {
        const { tutorId } = req.params;
        const { availability } = req.body;
        const updatedProfile = await TutorProfile.findByIdAndUpdate(tutorId, { availability }, { new: true });
        if (!updatedProfile) {
            return res.status(404).json({ message: 'Tutor not found' });
        }
        res.status(200).json({ message: 'Tutor availability updated successfully', updatedProfile });
    } catch (error) {
        res.status(500).json({ message: 'Error updating tutor availability', error });
    }
};