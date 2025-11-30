import { Request, Response } from 'express';
import { StudentService } from '../services/student.service';

export class StudentController {
    private studentService: StudentService;

    constructor() {
        this.studentService = new StudentService();
    }

    public async postAssignment(req: Request, res: Response): Promise<void> {
        try {
            const assignmentData = req.body;
            const newAssignment = await this.studentService.createAssignment(assignmentData);
            res.status(201).json(newAssignment);
        } catch (error) {
            res.status(500).json({ message: 'Error posting assignment', error });
        }
    }

    public async manageBookings(req: Request, res: Response): Promise<void> {
        try {
            const bookings = await this.studentService.getBookings(req.user.id);
            res.status(200).json(bookings);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving bookings', error });
        }
    }

    public async viewProposals(req: Request, res: Response): Promise<void> {
        try {
            const proposals = await this.studentService.getProposals(req.user.id);
            res.status(200).json(proposals);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving proposals', error });
        }
    }
}