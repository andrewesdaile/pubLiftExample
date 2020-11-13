"use strict";
// import { express } from "express";
// import express from 'express';
// import express = require('express');
// let express = require('express');
// import * as express from 'express';
// import express, {Request, Response} from "express";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = express_1.default();
const port = 8080;
//define a home page route handler
app.get("/", (req, res) => {
    res.send("Hello world!");
});
//start the server
app.listen(port, () => {
    //tslint:disable-next-line:no-console
    console.log(`server started at http://localhost:${port}`);
});
//# sourceMappingURL=helloworld.js.map