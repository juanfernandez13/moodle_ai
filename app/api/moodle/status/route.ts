import { handleMoodleRequest } from '../../../../src/server/moodle/api.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request: Request): Promise<Response> { return handleMoodleRequest(request, 'status'); }
