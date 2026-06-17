import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/game-client';
import type { ScoreUpdateResponse } from '@/lib/supabase/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, score } = body;

    // Validate input
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { error: 'Valid wallet address is required' },
        { status: 400 }
      );
    }

    if (!score || typeof score !== 'number' || score <= 0) {
      return NextResponse.json(
        { error: 'Valid score is required (must be positive number)' },
        { status: 400 }
      );
    }

    // Call the database function to update score
    const { data, error } = await supabase
      .rpc('update_game_score', {
        user_wallet: walletAddress,
        new_score: score
      });

    if (error) {
      console.error('Error updating game score:', error);
      return NextResponse.json(
        { error: 'Failed to update game score' },
        { status: 500 }
      );
    }

    // The database function returns a JSON object
    const result = data as {
      success: boolean;
      updated: boolean;
      current_score: number;
      rank: number | null;
      message: string;
    };

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 404 }
      );
    }

    const response: ScoreUpdateResponse = {
      success: result.success,
      updated: result.updated,
      current_score: result.current_score,
      rank: result.rank || undefined,
      message: result.message
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in game-score API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get current user's high score
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('the_hollow_users')
      .select('game_score')
      .eq('wallet_address', walletAddress)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user score:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user score' },
        { status: 500 }
      );
    }

    const gameScore = data?.game_score || 0;

    return NextResponse.json({ score: gameScore });
  } catch (error) {
    console.error('Error in game-score GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 