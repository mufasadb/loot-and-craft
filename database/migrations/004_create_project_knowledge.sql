-- Project Knowledge Base Migration
-- Stores project structure and implementation details for MCP/Supabase integration

-- Create project_knowledge table
CREATE TABLE IF NOT EXISTS project_knowledge (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Project information
  project_name VARCHAR(100) NOT NULL DEFAULT 'AOTV',
  version VARCHAR(20) DEFAULT '1.0.0',
  
  -- Structure information
  component_structure JSONB DEFAULT '{}',
  file_structure JSONB DEFAULT '{}',
  architecture_notes JSONB DEFAULT '{}',
  
  -- Implementation details
  features_implemented JSONB DEFAULT '{}',
  combat_system_details JSONB DEFAULT '{}',
  ui_implementation JSONB DEFAULT '{}',
  
  -- Technical documentation
  dependencies JSONB DEFAULT '{}',
  build_config JSONB DEFAULT '{}',
  deployment_info JSONB DEFAULT '{}',
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by VARCHAR(100) DEFAULT 'Claude Code',
  change_description TEXT,
  
  -- Ensure single project record
  UNIQUE(project_name)
);

-- Enable Row Level Security
ALTER TABLE project_knowledge ENABLE ROW LEVEL SECURITY;

-- Allow public read access for project knowledge (since it's development documentation)
CREATE POLICY "Public read access to project knowledge" ON project_knowledge
  FOR SELECT USING (true);

-- Allow authenticated users to update project knowledge
CREATE POLICY "Authenticated users can update project knowledge" ON project_knowledge
  FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_project_knowledge_updated_at 
  BEFORE UPDATE ON project_knowledge 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_project_knowledge_project_name ON project_knowledge(project_name);
CREATE INDEX idx_project_knowledge_last_updated ON project_knowledge(last_updated);