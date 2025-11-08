import mongoose from 'mongoose';

const attitudeAssignmentSchema = new mongoose.Schema(
  {
    tenantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Tenant', 
      required: true,
      index: true
    },
    attitudeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attitude',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAt: { type: Date, default: Date.now },
    isClaimed: { type: Boolean, default: false }, // Controle de resgate
  },
  { timestamps: true }
);

const AttitudeAssignment = mongoose.model(
  'AttitudeAssignment',
  attitudeAssignmentSchema
);

export default AttitudeAssignment;
