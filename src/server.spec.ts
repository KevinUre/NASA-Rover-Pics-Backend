import request from "supertest";
import app from "./server";

describe("Test the root path", () => {
  it("It should response the GET method", async () => {
    const response = await request(app).get("/hello");
    expect(response.statusCode).toBe(200);
    expect(response.body).toStrictEqual({"Greeting": "Hello World!"});
  });
});