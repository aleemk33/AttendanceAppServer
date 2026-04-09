import { sendCreated, sendSuccess } from "../../common/response.js";
import * as workFromHomeService from "./work-from-home.service.js";

export async function assignWorkFromHomeDays(req, res) {
  const result = await workFromHomeService.assignWorkFromHomeDays(
    req.user.roles,
    req.user.sub,
    req.params.userId,
    req.body,
  );

  sendCreated(res, result, "Work from home assigned");
}

export async function deleteWorkFromHomeDays(req, res) {
  const result = await workFromHomeService.deleteWorkFromHomeDays(
    req.user.roles,
    req.user.sub,
    req.params.userId,
    req.body,
  );

  sendSuccess(res, result, undefined, "Work from home removed");
}

export async function listWorkFromHomeDays(req, res) {
  const result = await workFromHomeService.listWorkFromHomeDays(
    req.user.roles,
    req.user.sub,
    req.query,
  );

  sendSuccess(res, result.items, result.meta);
}
