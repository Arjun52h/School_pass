const request = require("supertest");

const mockPasses = new Map();

jest.mock("../models/PickupPass", () => {
  return class PickupPass {
    constructor(data) {
      Object.assign(this, data);

      this.events = data.events || [];
    }

    async save() {
      mockPasses.set(this.code, this);
      return this;
    }

    static async findOne(query) {
      return mockPasses.get(query.code) || null;
    }
  };
});

jest.mock("../auth", () => ({
  authenticateUser: (req, res, next) => {
    req.user = {
      sub: "staff-demo-01",
      role: "staff"
    };
    next();
  },

  requireRole: () => (req, res, next) => {
    next();
  }
}));

const app = require("../server");

beforeEach(() => {
  mockPasses.clear();
});

describe("School Pickup Pass abuse cases", () => {

  test("expired pass should be refused", async () => {

    const expiredPass = {
  childName: "Test Child",
  authorizedPerson: "Test Guardian",
  date: "2020-01-01",
  startTime: "09:00",
  endTime: "10:00",
  code: "EXPIRED1",
  status: "upcoming",
  events: [],
  save: async function () {
    mockPasses.set(this.code, this);
    return this;
  }
};

mockPasses.set("EXPIRED1", expiredPass);

    const response = await request(app)
      .get("/api/passes/verify/EXPIRED1");

    expect(response.body.valid).toBe(false);
    expect(response.body.message).toBe(
      "This pickup pass has expired"
    );
  });


  test("cancelled pass should be refused", async () => {

    mockPasses.set("CANCEL01", {
      childName: "Test Child",
      authorizedPerson: "Test Guardian",
      date: "2099-01-01",
      startTime: "09:00",
      endTime: "10:00",
      code: "CANCEL01",
      status: "cancelled",
      events: []
    });

    const response = await request(app)
      .get("/api/passes/verify/CANCEL01");

    expect(response.body.valid).toBe(false);
    expect(response.body.message).toBe(
      "This pickup pass has been cancelled"
    );
  });


  test("already used pass should be refused", async () => {

    mockPasses.set("USED0001", {
      childName: "Test Child",
      authorizedPerson: "Test Guardian",
      date: "2099-01-01",
      startTime: "09:00",
      endTime: "10:00",
      code: "USED0001",
      status: "used",
      events: []
    });

    const response = await request(app)
      .get("/api/passes/verify/USED0001");

    expect(response.body.valid).toBe(false);
    expect(response.body.message).toBe(
      "This pickup pass has already been used"
    );
  });

});