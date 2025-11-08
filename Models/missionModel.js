import mongoose from 'mongoose';

const missionSchema = new mongoose.Schema({
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tenant', 
    required: true,
    index: true
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  coins: { type: Number, required: true },
  isCompleted: { type: Boolean, default: false }, 
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const Mission = mongoose.model('Mission', missionSchema);

export default Mission;
