// Замените на свои данные из Supabase
const SUPABASE_URL = 'https://tcqyaoniyniagvfpecpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjcXlhb25peW5pYWd2ZnBlY3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjY1NTAsImV4cCI6MjA4NzA0MjU1MH0.TEfz5MvlC5DfiTlN2EUULYCLXsfD3zAteDp8d-Y3OxY';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
