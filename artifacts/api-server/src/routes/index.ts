import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import todayRouter from "./today";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(todayRouter);

export default router;
