import { Router, type IRouter } from "express";
import mealsRouter from "./meals";
import meRouter from "./me";
import todayRouter from "./today";
import workoutsRouter from "./workouts";

const router: IRouter = Router();

router.use(meRouter);
router.use(mealsRouter);
router.use(todayRouter);
router.use(workoutsRouter);

export default router;
