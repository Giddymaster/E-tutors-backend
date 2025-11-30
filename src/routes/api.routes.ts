import { Router } from 'express';
import { createTutor, getTutors, updateTutor, deleteTutor } from '../controllers/tutors.controller';
import { createStudent, getStudents, updateStudent, deleteStudent } from '../controllers/students.controller';

const router = Router();

// Tutor routes
router.post('/tutors', createTutor);
router.get('/tutors', getTutors);
router.put('/tutors/:id', updateTutor);
router.delete('/tutors/:id', deleteTutor);

// Student routes
router.post('/students', createStudent);
router.get('/students', getStudents);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

export default router;