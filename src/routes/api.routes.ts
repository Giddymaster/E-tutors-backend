import { Router } from 'express';
import { createTutor, getTutors, updateMyTutor} from '../controllers/tutors.controller';
import { getMyStudent, updateMyStudent } from '../controllers/students.controller';

const router = Router();

// Tutor routes
router.post('/tutors', createTutor);
router.get('/tutors', getTutors);
router.put('/tutors/:id', updateMyTutor);
// router.delete('/tutors/:id', deleteMyTutor);

// Student routes
// router.post('/students', createMyStudent);
router.get('/students', getMyStudent);
router.put('/students/:id', updateMyStudent);
// router.delete('/students/:id', deleteMyStudent);

export default router;