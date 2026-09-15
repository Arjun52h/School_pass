const express = require("express")
const PickupPass = require("../models/PickupPass");
const { authenticateUser } = require("../auth");

const router = express.Router();

router.post("/", authenticateUser, async (req, res) => {
    try {
        const {
            childName,
            authorizedPerson,
            date,
            startTime,
            endTime
        } = req.body;
          

        const code = Math.random()
        .toString(36)
        .substring(2,8)
        .toUpperCase();

        const pickuppass = new PickupPass({
            childName,
            authorizedPerson,
            date,
            startTime,
            endTime,
            code,
            createdBy: req.user.sub,
            events:[
                {
                    action:"created",
                    performedBy: req.user.sub,
                    timestamp : new Date()
                }
            ]
        });

        const savedPass = await pickuppass.save();



        res.status(201).json({
            message:"Pickup Pass created Succeffully",
            pass :savedPass
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message:"Failed to create pickup pass"
        });
        
    }
});

// Verify a pickup pass
router.get("/verify/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const pickupPass = await PickupPass.findOne({ code });

    // Pass does not exist
    if (!pickupPass) {
      return res.status(404).json({
        valid: false,
        message: "Pickup pass not found"
      });
    }

    // Pass was cancelled
    if (pickupPass.status === "cancelled") {
      return res.json({
        valid: false,
        message: "This pickup pass has been cancelled",
        pass: pickupPass
      });
    }

    // Pass was already used
    if (pickupPass.status === "used") {
      return res.json({
        valid: false,
        message: "This pickup pass has already been used",
        pass: pickupPass
      });
    }

    // Create the pickup window
const start = new Date(`${pickupPass.date}T${pickupPass.startTime}:00+05:30`);
const end = new Date(`${pickupPass.date}T${pickupPass.endTime}:00+05:30`);
const now = new Date();

    // Pickup window has not started
    if (now < start) {
  return res.status(400).json({
    valid: false,
    message: "Pickup window has not started yet",
    pass : pickupPass
  });
}

if (now > end) {
  pickupPass.status = "expired";
  await pickupPass.save();

  return res.status(400).json({
    valid: false,
    message: "This pickup pass has expired",
    pass:pickupPass
  });
}

    // Record successful verification
    pickupPass.events.push({
      action: "verified",
      performedBy: "staff-demo-01",
      timestamp: new Date()
    });

    pickupPass.status = "valid";

    await pickupPass.save();

    return res.json({
      valid: true,
      message: "Pickup pass is valid",
      pass: pickupPass
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      valid: false,
      message: "Failed to verify pickup pass"
    });
  }
});


// Complete pickup handoff
router.patch("/complete/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const pickupPass = await PickupPass.findOne({ code });

    if (!pickupPass) {
      return res.status(404).json({
        success: false,
        message: "Pickup pass not found"
      });
    }

    if (pickupPass.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "This pickup pass has been cancelled"
      });
    }

    if (pickupPass.status === "used") {
      return res.status(400).json({
        success: false,
        message: "This pickup pass has already been used"
      });
    }

    if (pickupPass.status === "expired") {
      return res.status(400).json({
        success: false,
        message: "This pickup pass has expired"
      });
    }

    pickupPass.status = "used";

    pickupPass.events.push({
      action: "handoff_completed",
      performedBy: "staff-demo-01",
      timestamp: new Date()
    });

    await pickupPass.save();

    res.json({
      success: true,
      message: "Pickup handoff completed successfully",
      pass: pickupPass
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to complete pickup handoff"
    });
  }
});

// Cancel a pickup pass
router.patch("/cancel/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const pickupPass = await PickupPass.findOne({ code });

    if (!pickupPass) {
      return res.status(404).json({
        success: false,
        message: "Pickup pass not found"
      });
    }

    if (pickupPass.status === "used") {
      return res.status(400).json({
        success: false,
        message: "A used pickup pass cannot be cancelled"
      });
    }

    if (pickupPass.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "This pickup pass is already cancelled"
      });
    }

    pickupPass.status = "cancelled";

    pickupPass.events.push({
      action: "cancelled",
      performedBy: "guardian-demo-01",
      timestamp: new Date()
    });

    await pickupPass.save();

    res.json({
      success: true,
      message: "Pickup pass cancelled successfully",
      pass: pickupPass
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel pickup pass"
    });
  }
});

module.exports = router;