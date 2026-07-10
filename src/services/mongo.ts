
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb"
import type { Collection, Db, Document } from "mongodb"
import type {
  AIAnalysis,
  AnalyticsSnapshot,
  Complaint,
  ComplaintCategory,
  ComplaintStatus,
  Department,
  NotificationItem,
  User,
  Comment,
  Petition,
  AuditLog,
} from "../types"

const uri = import.meta.env.VITE_MONGO_URI || "mongodb://localhost:27017"
const dbName = import.meta.env.VITE_MONGO_DB_NAME || "janvoice_ai"

let client: MongoClient
let db: Db

export async function connectToMongo(): Promise<void> {
  if (db) {
    console.log("Already connected to MongoDB.")
    return
  }
  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    })
    await client.connect()
    db = client.db(dbName)
    console.log("Connected to MongoDB!")

    // Ensure collections and indexes
    await ensureCollectionsAndIndexes()
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error)
    process.exit(1) // Exit if we can\"t connect to the database
  }
}

export async function disconnectFromMongo(): Promise<void> {
  if (client) {
    await client.close()
    console.log("Disconnected from MongoDB.")
  }
}

// Helper to get a collection
function getCollection<T extends Document>(name: string): Collection<T> {
  if (!db) {
    throw new Error("MongoDB not connected. Call connectToMongo() first.")
  }
  return db.collection<T>(name)
}

async function ensureCollectionsAndIndexes(): Promise<void> {
  const complaintsCol = getCollection<Complaint>("complaints")
  await complaintsCol.createIndex({ "id": 1 }, { unique: true, name: "id_1" })
  await complaintsCol.createIndex({ userId: 1 })
  await complaintsCol.createIndex({ status: 1 })
  await complaintsCol.createIndex({ category: 1 })
  await complaintsCol.createIndex({ "gpsCoordinates.coordinates": "2dsphere" })
  await complaintsCol.createIndex({ title: "text", description: "text" })

  const usersCol = getCollection<User>("users")
  await usersCol.createIndex({ uid: 1 }, { unique: true })
  await usersCol.createIndex({ email: 1 }, { unique: true })

  const commentsCol = getCollection<Comment>("comments")
  await commentsCol.createIndex({ complaintId: 1 })

  const petitionsCol = getCollection<Petition>("petitions")
  await petitionsCol.createIndex({ "id": 1 }, { unique: true, name: "id_1" })

  const auditLogsCol = getCollection<AuditLog>("auditLogs")
  await auditLogsCol.createIndex({ timestamp: 1 })

  const departmentsCol = getCollection<Department>("departments")
  await departmentsCol.createIndex({ "id": 1 }, { unique: true, name: "id_1" })
}

// ===========================================
// USER SERVICES
// ===========================================

export async function createUserProfile(user: User): Promise<void> {
  const usersCol = getCollection<User>("users")
  await usersCol.insertOne(user)
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const usersCol = getCollection<User>("users")
  const userDoc = await usersCol.findOne({ uid })
  return userDoc ? (userDoc as User) : null
}

export async function updateUserProfile(uid: string, updates: Partial<User>): Promise<void> {
  const usersCol = getCollection<User>("users")
  await usersCol.updateOne({ uid }, { $set: updates })
}

// ===========================================
// COMPLAINT SERVICES
// ===========================================

export async function createComplaint(complaint: Omit<Complaint, "id" | "_id">): Promise<string> {
  const complaintsCol = getCollection<Complaint>("complaints")
  const result = await complaintsCol.insertOne({
    ...complaint,
    id: new ObjectId().toHexString(), // Generate a unique string id for client-side use
    createdAt: new Date(),
    updatedAt: new Date(),
    statusHistory: [{ status: "Submitted", timestamp: new Date() }],
  })
  return result.insertedId.toString()
}

export async function updateComplaintStatus(
  _id: string,
  status: ComplaintStatus,
  notes?: string,
  updatedBy?: string
): Promise<void> {
  const complaintsCol = getCollection<Complaint>("complaints")
  await complaintsCol.updateOne(
    { _id: new ObjectId(_id) as any },
    {
      $set: { status, updatedAt: new Date() },
      $push: {
        statusHistory: { status, timestamp: new Date(), notes, updatedBy },
      },
    }
  )
}

export async function updateComplaintAnalysis(
  _id: string,
  aiAnalysis: AIAnalysis
): Promise<void> {
  const complaintsCol = getCollection<Complaint>("complaints")
  await complaintsCol.updateOne(
    { _id: new ObjectId(_id) as any },
    { $set: { aiAnalysis, category: aiAnalysis.category, updatedAt: new Date() } }
  )
}

export async function getAllComplaints(): Promise<Complaint[]> {
  const complaintsCol = getCollection<Complaint>("complaints")
  return (await complaintsCol.find({}).sort({ createdAt: -1 }).toArray()).map(doc => ({
    ...doc,
    _id: doc._id.toString(),
    id: doc._id.toString(), // Ensure client-side `id` matches `_id`
  }))
}

export async function getUserComplaints(userId: string): Promise<Complaint[]> {
  const complaintsCol = getCollection<Complaint>("complaints")
  return (await complaintsCol.find({ userId }).sort({ createdAt: -1 }).toArray()).map(doc => ({
    ...doc,
    _id: doc._id.toString(),
    id: doc._id.toString(), // Ensure client-side `id` matches `_id`
  }))
}

export async function getComplaintById(_id: string): Promise<Complaint | null> {
  const complaintsCol = getCollection<Complaint>("complaints")
  const complaintDoc = await complaintsCol.findOne({ _id: new ObjectId(_id) as any })
  return complaintDoc ? { ...complaintDoc, _id: complaintDoc._id.toString(), id: complaintDoc._id.toString() } : null
}

export async function upvoteComplaint(complaintId: string, userId: string): Promise<void> {
  const complaintsCol = getCollection<Complaint>("complaints")
  const complaint = await complaintsCol.findOne({ _id: new ObjectId(complaintId) as any })

  if (complaint) {
    let newUpvotes = complaint.upvotes || 0
    let newUsers = complaint.upvotedUsers || []

    if (newUsers.includes(userId)) {
      newUsers = newUsers.filter((uid) => uid !== userId)
      newUpvotes = Math.max(0, newUpvotes - 1)
    } else {
      newUsers.push(userId)
      newUpvotes += 1
    }
    await complaintsCol.updateOne(
    { _id: new ObjectId(complaintId) as any },
      { $set: { upvotes: newUpvotes, upvotedUsers: newUsers } }
    )
  }
}

export async function forwardComplaintToDepartment(
  _id: string,
  departmentId: string,
  mpUser: User
): Promise<void> {
  const complaintsCol = getCollection<Complaint>("complaints")
  await complaintsCol.updateOne(
    { _id: new ObjectId(_id) as any },
    {
      $set: { forwardedDepartment: departmentId, status: "Assigned to Department", updatedAt: new Date() },
      $push: {
        statusHistory: {
          status: "Assigned to Department",
          timestamp: new Date(),
          notes: `Forwarded by ${mpUser.displayName} to ${departmentId}`,
        },
      },
    }
  )
  await addAuditLog({
    action: `Forwarded Complaint #${_id} to ${departmentId}`,
    userId: mpUser.uid,
    userName: mpUser.displayName,
    userRole: mpUser.role,
    timestamp: new Date(),
  })
}

// ===========================================
// COMMENT SERVICES
// ===========================================

export async function addComment(comment: Omit<Comment, "id" | "_id">): Promise<Comment> {
  const commentsCol = getCollection<Comment>("comments")
  const newCommentWithId = {
    ...comment,
    _id: new ObjectId(),
    id: new ObjectId().toHexString(), // Generate a string ID for the client
    createdAt: new Date(),
  }
  await commentsCol.insertOne(newCommentWithId)
  return { ...comment, id: newCommentWithId.id }
}

export async function getCommentsForComplaint(complaintId: string): Promise<Comment[]> {
  const commentsCol = getCollection<Comment>("comments")
  return (await commentsCol.find({ complaintId }).sort({ createdAt: 1 }).toArray()).map(doc => ({
    ...doc,
    _id: doc._id.toHexString(),
    id: doc._id.toHexString(), // Ensure client-side `id` matches `_id`
  }))
}

// ===========================================
// PETITION SERVICES
// ===========================================

export async function getAllPetitions(): Promise<Petition[]> {
  const petitionsCol = getCollection<Petition>("petitions")
  return (await petitionsCol.find({}).sort({ createdAt: -1 }).toArray()).map(doc => ({
    ...doc,
    _id: doc._id.toHexString(),
    id: doc._id.toHexString(), // Ensure client-side `id` matches `_id`
  }))
}

export async function createPetition(petition: Omit<Petition, "id" | "_id">): Promise<string> {
  const petitionsCol = getCollection<Petition>("petitions")
  const result = await petitionsCol.insertOne({
    ...petition,
    _id: new ObjectId(),
    id: new ObjectId().toHexString(),
    createdAt: new Date(),
    signaturesCount: 1,
    signedUsers: [petition.signedUsers[0]], // Assuming creator is the first signer
  })
  return result.insertedId.toHexString()
}

export async function signPetition(petitionId: string, userId: string): Promise<void> {
  const petitionsCol = getCollection<Petition>("petitions")
  await petitionsCol.updateOne(
    { _id: new ObjectId(petitionId), signedUsers: { $ne: userId } },
    { $inc: { signaturesCount: 1 }, $push: { signedUsers: userId } }
  )
}

// ===========================================
// DEPARTMENT SERVICES
// ===========================================

export async function getDepartments(): Promise<Department[]> {
  const departmentsCol = getCollection<Department>("departments")
  return (await departmentsCol.find({}).sort({ name: 1 }).toArray()).map(doc => ({
    ...doc,
    _id: doc._id.toHexString(),
    id: doc._id.toHexString(), // Ensure client-side `id` matches `_id`
  }))
}

export async function createDepartment(department: Omit<Department, "id" | "_id">): Promise<string> {
  const departmentsCol = getCollection<Department>("departments")
  const result = await departmentsCol.insertOne({
    ...department,
    _id: new ObjectId(),
    id: new ObjectId().toHexString(),
    createdAt: new Date(),
  })
  return result.insertedId.toHexString()
}

// ===========================================
// NOTIFICATION SERVICES
// ===========================================

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const notificationsCol = getCollection<NotificationItem>("notifications")
  return (await notificationsCol.find({ userId }).sort({ createdAt: -1 }).toArray()).map(doc => ({
    ...doc,
    _id: doc._id.toHexString(),
    id: doc._id.toHexString(), // Ensure client-side `id` matches `_id`
  }))
}

export async function markNotificationRead(id: string): Promise<void> {
  const notificationsCol = getCollection<NotificationItem>("notifications")
  await notificationsCol.updateOne({ _id: new ObjectId(id) }, { $set: { read: true } })
}

// ===========================================
// AUDIT LOG SERVICES
// ===========================================

export async function getActivityLogs(): Promise<AuditLog[]> {
  const auditLogsCol = getCollection<AuditLog>("auditLogs")
  return (await auditLogsCol.find({}).sort({ timestamp: -1 }).toArray()).map(doc => ({
    ...doc,
    _id: doc._id.toHexString(),
    id: doc._id.toHexString(), // Ensure client-side `id` matches `_id`
  }))
}

export async function addAuditLog(log: Omit<AuditLog, "id" | "_id">): Promise<void> {
  const auditLogsCol = getCollection<AuditLog>("auditLogs")
  await auditLogsCol.insertOne({ ...log, _id: new ObjectId(), id: new ObjectId().toHexString(), timestamp: new Date() })
}

// ===========================================
// ANALYTICS SERVICES
// ===========================================

export async function getAnalytics(): Promise<AnalyticsSnapshot> {
  const complaintsCol = getCollection<Complaint>("complaints")
  const totalComplaints = await complaintsCol.countDocuments()
  const resolvedComplaints = await complaintsCol.countDocuments({ status: "Resolved" })
  const resolutionRate = totalComplaints
    ? Math.round((resolvedComplaints / totalComplaints) * 100)
    : 0

  // Aggregate category distribution
  const categoryDistribution = await complaintsCol.aggregate<{ _id: ComplaintCategory; count: number }>([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $project: { category: "$_id", count: 1, _id: 0 } }
  ]).toArray()

  // Aggregate department performance
  const departmentPerformance = await complaintsCol.aggregate<{ _id: string; count: number }>([
    { $match: { forwardedDepartment: { $exists: true, $ne: null } } },
    { $group: { _id: "$forwardedDepartment", count: { $sum: 1 } } },
    { $project: { department: "$_id", count: 1, _id: 0 } }
  ]).toArray()

  // Placeholder for officer performance, as full aggregation would require officer assignment logic
  const officerPerformance: { officer: string; count: number }[] = []

  const pendingComplaints = await complaintsCol.countDocuments({ status: "Pending" })
  const activeComplaints = await complaintsCol.countDocuments({
    status: { $nin: ["Resolved", "Closed", "Rejected", "Archived"] }
  })
  const highPriorityComplaints = await complaintsCol.countDocuments({ priority: "High" })

  // Placeholder for complaintsByWard / complaintsByMonth
  const complaintsByWard: Array<{ ward: string; count: number }> = []
  const complaintsByMonth: Array<{ month: string; count: number }> = [
    { month: "Apr", count: Math.floor(totalComplaints * 0.25) },
    { month: "May", count: Math.floor(totalComplaints * 0.35) },
    { month: "Jun", count: totalComplaints - Math.floor(totalComplaints * 0.25) - Math.floor(totalComplaints * 0.35) },
  ]

  return {
    totalComplaints,
    resolvedComplaints,
    pendingComplaints,
    activeComplaints,
    highPriorityComplaints,
    resolutionRate,
    averageResponseTime: 14,
    averageResolutionTime: 21,
    weeklyReports: [
      { label: "Week 1", value: Math.floor(totalComplaints * 0.2) },
      { label: "Week 2", value: Math.floor(totalComplaints * 0.3) },
      { label: "Week 3", value: totalComplaints - Math.floor(totalComplaints * 0.2) - Math.floor(totalComplaints * 0.3) },
    ],
    monthlyReports: [
      { label: "Apr", value: Math.floor(totalComplaints * 0.25) },
      { label: "May", value: Math.floor(totalComplaints * 0.35) },
      { label: "Jun", value: totalComplaints - Math.floor(totalComplaints * 0.25) - Math.floor(totalComplaints * 0.35) },
    ],
    categoryDistribution: categoryDistribution.map(c => ({ category: c._id, count: c.count })),
    departmentPerformance: departmentPerformance.map(d => ({ department: d._id, count: d.count })),
    officerPerformance,
    complaintsByWard,
    complaintsByMonth,
  }
}
