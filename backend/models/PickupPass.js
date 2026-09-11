const mongoose = require("mongoose");

const pickupPassSchema = new mongoose.Schema(
  {
    childName: {
      type: String,
      required: true,
      trim: true
    },

    authorizedPerson: {
      type: String,
      required: true,
      trim: true
    },

    date: {
      type: String,
      required: true
    },

    startTime: {
      type: String,
      required: true
    },

    endTime: {
      type: String,
      required: true
    },

    code: {
      type: String,
      required: true,
      unique: true
    },

    status: {
      type: String,
      enum: ["upcoming", "valid", "cancelled", "expired", "used"],
      default: "upcoming"
    },

    createdBy: {
      type: String,
      required: true
    },

    events: [
      {
        action: String,
        performedBy: String,
        reason: String,
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("PickupPass", pickupPassSchema);