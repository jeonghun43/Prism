import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This API route deletes users created more than 7 days ago
// It should be called daily by a cron service (e.g., Vercel Cron, GitHub Actions, etc.)
// To secure this endpoint, you can add an authorization header check

export async function GET(request: Request) {
  try {
    // Optional: Add authorization check
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service_role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Call the database function to delete expired users
    const { data, error } = await supabase.rpc('delete_expired_users')
    
    if (error) {
      console.error('Error deleting expired users:', error)
      return NextResponse.json(
        { error: 'Failed to delete expired users', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Expired users deleted successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error in delete-expired-users cron job:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Allow POST method as well (some cron services prefer POST)
export async function POST(request: Request) {
  return GET(request)
}

