import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import tagsRouter from "./tags";
import salesRouter from "./sales";
import customersRouter from "./customers";
import usersRouter from "./users";
import imagesRouter from "./images";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/dashboard", dashboardRouter);
router.use("/products", productsRouter);
router.use("/categories", categoriesRouter);
router.use("/tags", tagsRouter);
router.use("/sales", salesRouter);
router.use("/customers", customersRouter);
router.use("/users", usersRouter);
router.use("/images", imagesRouter);
router.use(storageRouter);

export default router;
