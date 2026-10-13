import { useState } from 'react'
import { getAIRecommendation } from './aiApi'
import './App.css'
type AssessmentQuestion = {
  id: number
  question: string
  options: string[]
  correctAnswer: number
}
type LearningNode = {
  id: number
  type: 'unit' | 'assessment'
  title: string
  description: string
  questions?: AssessmentQuestion[]
}
type SavedLearningPath = {
  databaseId?: number
  id?: number
  name: string
  description?: string
  status?: string
  payload?: string | { nodes?: unknown; content?: unknown }
  content?: string | LearningNode[]
}
const API_URL = 'http://localhost:8080/api/learning-paths'
const initialNodes: LearningNode[] = [
  {
    id: 1,
    type: 'unit',
    title: 'Introduction',
    description: 'Introduce the learning objectives.',
  },
  {
    id: 2,
    type: 'unit',
    title: 'Core Concepts',
    description: 'Learn the essential concepts and fundamentals.',
  },
  {
    id: 3,
    type: 'assessment',
    title: 'Knowledge Check',
    description: 'Test your understanding of the material.',
    questions: [{ id: 1, question: 'Which keyword is used to inherit a class in Java?', options: ['implements', 'extends', 'imports', 'package'], correctAnswer: 1 }],
  },
]
function getPathId(path: SavedLearningPath): number | undefined {
  return path.databaseId ?? path.id
}
function parsePathContent(path: SavedLearningPath): LearningNode[] {
  // The Spring Boot API stores the complete LearningPathRequest in `payload`.
  // Older frontend records may use `content`, so support both formats.
  let parsed: unknown = path.payload ?? path.content
  if (parsed == null) {
    throw new Error('This saved path has no payload or content.')
  }

  for (let i = 0; i < 3 && typeof parsed === 'string'; i++) {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      throw new Error('Saved learning path payload is not valid JSON.')
    }
  }

  if (Array.isArray(parsed)) {
    return normalizeFrontendNodes(parsed)
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Saved path payload is not an object or node list.')
  }

  const wrapper = parsed as { nodes?: unknown; content?: unknown }
  let rawNodes: unknown = wrapper.nodes ?? wrapper.content
  if (typeof rawNodes === 'string') {
    try {
      rawNodes = JSON.parse(rawNodes)
    } catch {
      throw new Error('Could not parse the saved nodes.')
    }
  }
  if (!Array.isArray(rawNodes)) {
    throw new Error('Saved content is not a list of learning blocks. Check the backend response.')
  }

  // Backend NodeDto uses label/type/config; the editor uses title/questions.
  return rawNodes.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Learning block ${index + 1} has invalid data.`)
    }
    const node = item as {
      id?: string | number
      type?: string
      label?: string
      title?: string
      description?: string
      config?: Record<string, unknown>
      questions?: unknown
    }
    const rawType = (node.type ?? '').toLowerCase()
    const type: LearningNode['type'] = rawType.includes('assessment') || rawType.includes('quiz') ? 'assessment' : 'unit'
    const configQuestions = node.config?.questions
    const questionsSource = Array.isArray(node.questions) ? node.questions : configQuestions
    const questions: AssessmentQuestion[] = Array.isArray(questionsSource)
      ? questionsSource.map((q, qIndex) => {
          const question = (q && typeof q === 'object' ? q : {}) as Record<string, unknown>
          const options = Array.isArray(question.options) ? question.options.map(String) : ['', '', '', '']
          const answer = Number(question.correctAnswer)
          return {
            id: Number(question.id) || qIndex + 1,
            question: typeof question.question === 'string' ? question.question : '',
            options,
            correctAnswer: Number.isInteger(answer) && answer >= 0 && answer < options.length ? answer : 0,
          }
        })
      : []
    const numericId = Number(node.id)
    return {
      id: Number.isFinite(numericId) && numericId > 0 ? numericId : index + 1,
      type,
      title: typeof node.title === 'string' ? node.title : typeof node.label === 'string' ? node.label : `Block ${index + 1}`,
      description: typeof node.description === 'string' ? node.description : '',
      ...(type === 'assessment' ? { questions } : {}),
    }
  })
}

function normalizeFrontendNodes(rawNodes: unknown[]): LearningNode[] {
  return rawNodes.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Learning block ${index + 1} has invalid data.`)
    const node = item as Partial<LearningNode>
    if (node.type !== 'unit' && node.type !== 'assessment') throw new Error(`Learning block ${index + 1} has invalid type.`)
    const questions = Array.isArray(node.questions) ? node.questions.map((q, qIndex) => ({
      id: Number(q.id) || qIndex + 1,
      question: typeof q.question === 'string' ? q.question : '',
      options: Array.isArray(q.options) ? q.options.map(String) : ['', '', '', ''],
      correctAnswer: Number.isInteger(q.correctAnswer) && q.correctAnswer >= 0 && q.correctAnswer < 4 ? q.correctAnswer : 0,
    })) : []
    return {
      id: Number(node.id) || index + 1,
      type: node.type,
      title: typeof node.title === 'string' ? node.title : '',
      description: typeof node.description === 'string' ? node.description : '',
      ...(node.type === 'assessment' ? { questions } : {}),
    }
  })
}

function App() {
  const [prompt, setPrompt] = useState(
    'Create a beginner learning path with a knowledge assessment.',
  )
  const [nodes, setNodes] = useState<LearningNode[]>(initialNodes)
  const [selectedId, setSelectedId] = useState<number | null>(1)
  const [status, setStatus] = useState('Draft')
  const [nextId, setNextId] = useState(4)
  const [saving, setSaving] = useState(false)
  const [loadingPaths, setLoadingPaths] = useState(false)
  const [savedPaths, setSavedPaths] = useState<SavedLearningPath[]>([])
  const [backendPathId, setBackendPathId] = useState<number | null>(null)
  const [selectedBackendPathId, setSelectedBackendPathId] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationPassed, setValidationPassed] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [aiRecommendation, setAiRecommendation] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const selectedNode = nodes.find((node) => node.id === selectedId)
  function openLearnerPreview() {
    setQuizAnswers({})
    setQuizSubmitted(false)
    setAiRecommendation('')
    setAiError('')
    setAiLoading(false)
    setPreviewMode(true)
  }
  function setQuizAnswer(nodeId: number, questionId: number, optionIndex: number) {
    setQuizAnswers((current) => ({ ...current, [`${nodeId}-${questionId}`]: optionIndex }))
  }
  const quizQuestions = nodes.flatMap((node) =>
    node.type === 'assessment'
      ? (node.questions ?? []).map((question) => ({ nodeId: node.id, question }))
      : [],
  )
  const quizScore = quizQuestions.reduce((score, item) =>
    score + (quizAnswers[`${item.nodeId}-${item.question.id}`] === item.question.correctAnswer ? 1 : 0), 0,
  )
  async function submitQuiz() {
    const unanswered = quizQuestions.filter(
      (item) => quizAnswers[`${item.nodeId}-${item.question.id}`] === undefined,
    )
    if (unanswered.length > 0) {
      alert(`Please answer all questions. ${unanswered.length} question(s) remain unanswered.`)
      return
    }

    // Show quiz results immediately; AI recommendations load independently.
    setQuizSubmitted(true)
    setAiRecommendation('')
    setAiError('')
    setAiLoading(true)

    const percentage = quizQuestions.length > 0
      ? Math.round((quizScore / quizQuestions.length) * 100)
      : 0
    const learningContext = nodes
      .filter((node) => node.type === 'assessment')
      .map((node) => node.title)
      .filter(Boolean)
      .join(', ') || prompt.trim() || 'Learning path quiz'

    try {
      const recommendation = await getAIRecommendation(percentage, learningContext)
      setAiRecommendation(recommendation)
    } catch (error) {
      console.error('AI recommendation failed:', error)
      setAiError(
        error instanceof Error
          ? error.message
          : 'Unable to generate an AI recommendation. You can still review your quiz results.',
      )
    } finally {
      setAiLoading(false)
    }
  }
  function addNode(type: LearningNode['type']) {
    const node: LearningNode = {
      id: nextId,
      type,
      title: type === 'unit' ? 'New Learning Unit' : 'New Assessment',
      description:
        type === 'unit'
          ? 'Add learning content here.'
          : 'Add assessment questions here.',
      ...(type === 'assessment'
        ? { questions: [{ id: 1, question: '', options: ['', '', '', ''], correctAnswer: 0 }] }
        : {}),
    }
    setNodes((current) => [...current, node])
    setSelectedId(nextId)
    setNextId((current) => current + 1)
    setStatus('Draft')
  }
  function updateSelected(field: 'title' | 'description', value: string) {
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedId ? { ...node, [field]: value } : node,
      ),
    )
    setStatus('Draft')
  }
  function updateQuestion(questionId: number, changes: Partial<AssessmentQuestion>) {
    setNodes((current) => current.map((node) => node.id !== selectedId ? node : {
      ...node,
      questions: (node.questions ?? []).map((question) => question.id === questionId ? { ...question, ...changes } : question),
    }))
    setStatus('Draft')
  }
  function addQuestion() {
    if (!selectedNode || selectedNode.type !== 'assessment') return
    const questions = selectedNode.questions ?? []
    const newId = Math.max(0, ...questions.map((question) => question.id)) + 1
    setNodes((current) => current.map((node) => node.id === selectedId ? {
      ...node,
      questions: [...(node.questions ?? []), { id: newId, question: '', options: ['', '', '', ''], correctAnswer: 0 }],
    } : node))
    setStatus('Draft')
  }
  function deleteQuestion(questionId: number) {
    setNodes((current) => current.map((node) => node.id !== selectedId ? node : {
      ...node,
      questions: (node.questions ?? []).filter((question) => question.id !== questionId),
    }))
    setStatus('Draft')
  }
  function updateQuestionOption(questionId: number, optionIndex: number, value: string) {
    const question = selectedNode?.questions?.find((item) => item.id === questionId)
    if (!question) return
    const options = [...question.options]
    options[optionIndex] = value
    updateQuestion(questionId, { options })
  }
  function deleteSelected() {
    if (selectedId === null) return
    const remaining = nodes.filter((node) => node.id !== selectedId)
    setNodes(remaining)
    setSelectedId(remaining[0]?.id ?? null)
    setStatus('Draft')
  }
  function saveLocally() {
    localStorage.setItem(
      'edrevel-learning-path',
      JSON.stringify({ prompt, nodes }),
    )
    setStatus('Saved locally')
    alert('Learning path saved in this browser.')
  }
  function loadLocally() {
    const saved = localStorage.getItem('edrevel-learning-path')
    if (!saved) {
      alert('No locally saved learning path was found.')
      return
    }
    try {
      const parsed = JSON.parse(saved)
      const restoredNodes: unknown = Array.isArray(parsed)
        ? parsed
        : parsed.nodes
      if (!Array.isArray(restoredNodes)) {
        throw new Error('Invalid saved learning path')
      }
      const restored = restoredNodes as LearningNode[]
      setNodes(restored)
      setSelectedId(restored[0]?.id ?? null)
      setNextId(Math.max(0, ...restored.map((node) => node.id)) + 1)
      if (typeof parsed.prompt === 'string') {
        setPrompt(parsed.prompt)
      }
      setBackendPathId(null)
      setSelectedBackendPathId('')
      setStatus('Loaded locally — unsaved to backend')
    } catch (error) {
      console.error('Load locally failed:', error)
      alert('The saved learning path could not be read.')
    }
  }
  
const [generating] = useState(false)


function generateSample() {
  if (!prompt.trim()) {
    alert('Please describe the learning path first.')
    return
  }

  const topic = prompt.trim()
  const firstId = nextId

  const newNodes: LearningNode[] = [
    {
      id: firstId,
      type: 'unit',
      title: 'Introduction',
      description: `Introduction and learning objectives for: ${topic}`,
    },
    {
      id: firstId + 1,
      type: 'unit',
      title: 'Variables and Data Types',
      description:
        'Learn variables, primitive data types, declarations, and examples.',
    },
    {
      id: firstId + 2,
      type: 'unit',
      title: 'Object-Oriented Programming',
      description:
        'Learn classes, objects, inheritance, encapsulation, and polymorphism.',
    },
    {
      id: firstId + 3,
      type: 'assessment',
      title: 'Knowledge Check',
      description: 'Test your understanding with multiple-choice questions.',
      questions: [
        {
          id: 1,
          question: 'Which keyword is used to inherit a class in Java?',
          options: ['implements', 'extends', 'imports', 'package'],
          correctAnswer: 1,
        },
        {
          id: 2,
          question: 'Which of these is a primitive data type in Java?',
          options: ['String', 'Integer', 'int', 'Scanner'],
          correctAnswer: 2,
        },
        {
          id: 3,
          question: 'Which keyword is used to create an object in Java?',
          options: ['class', 'new', 'void', 'static'],
          correctAnswer: 1,
        },
      ],
    },
  ]

  setNodes(newNodes)
  setSelectedId(firstId)
  setNextId(firstId + newNodes.length)
  setBackendPathId(null)
  setSelectedBackendPathId('')
  setStatus('Demo learning path generated')
}

  async function loadBackendPaths() {
    setLoadingPaths(true)
    try {
      const response = await fetch(API_URL)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data: unknown = await response.json()
      if (!Array.isArray(data)) {
        throw new Error('Expected an array of saved learning paths.')
      }
      const paths = data as SavedLearningPath[]
      setSavedPaths(paths)
      if (paths.length === 0) {
        setSelectedBackendPathId('')
        alert('No saved learning paths found in the backend.')
      } else {
        setStatus(`Backend connected — ${paths.length} path(s) found`)
      }
    } catch (error) {
      console.error('Load paths failed:', error)
      alert(
        `Could not load learning paths: ${
          error instanceof Error ? error.message : 'Unknown error'
        }. Check that Spring Boot is running on port 8080 and CORS is allowed.`,
      )
    } finally {
      setLoadingPaths(false)
    }
  }
  function loadSelectedBackendPath() {
    const pathId = Number(selectedBackendPathId)
    const path = savedPaths.find((item) => getPathId(item) === pathId)
    if (!path || !pathId) {
      alert('Please choose a saved learning path first.')
      return
    }
    try {
      const restoredNodes = parsePathContent(path)
      setNodes(restoredNodes)
      setSelectedId(restoredNodes[0]?.id ?? null)
      setNextId(Math.max(0, ...restoredNodes.map((node) => node.id)) + 1)
      setPrompt(path.description ?? '')
      setBackendPathId(pathId)
      setStatus(`Editing backend path #${pathId}`)
    } catch (error) {
      console.error('Could not restore saved path:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'The saved path content could not be loaded.',
      )
    }
  }
  function validatePath(): boolean {
    const errors: string[] = []
    if (nodes.length === 0) {
      errors.push('Add at least one learning unit or assessment.')
    }
    nodes.forEach((node, index) => {
      const blockName = node.title.trim() || `Block ${index + 1}`
      if (!node.title.trim()) {
        errors.push(`${blockName}: title is required.`)
      }
      if (!node.description.trim()) {
        errors.push(`${blockName}: description is required.`)
      }
    })
    setValidationErrors(errors)
    setValidationPassed(errors.length === 0)
    if (errors.length === 0) {
      setStatus('Validation passed')
    } else {
      setStatus(`Validation failed — ${errors.length} issue(s)`)
    }
    return errors.length === 0
  }
  async function saveToBackend() {
    if (!validatePath()) {
      alert('Please fix the validation errors before saving.')
      return
    }
    setSaving(true)
    try {
      const isEditing = backendPathId !== null
      const url = isEditing ? `${API_URL}/${backendPathId}` : API_URL
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Edrevel Learning Path',
          description: prompt,
          status: 'DRAFT',
          version: 1,
          canvas: null,
          nodes: nodes.map((node, index) => ({
            id: String(node.id),
            componentId: String(node.id),
            type: node.type,
            label: node.title,
            description: node.description,
            position: { x: 100, y: index * 150 },
            config: {
              questions: node.type === 'assessment' ? (node.questions ?? []) : [],
            },
          })),
          edges: [],
        }),
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(`HTTP ${response.status}${message ? `: ${message}` : ''}`)
      }
      const saved = (await response.json().catch(() => null)) as
        | SavedLearningPath
        | null
      const returnedId = saved ? getPathId(saved) : undefined
      if (returnedId !== undefined) {
        setBackendPathId(returnedId)
        setSelectedBackendPathId(String(returnedId))
      }
      setStatus(isEditing ? 'Updated in backend' : 'Saved to backend')
      alert(
        isEditing
          ? 'Learning path updated successfully.'
          : 'Learning path saved successfully.',
      )
      await loadBackendPaths()
    } catch (error) {
      console.error('Save failed:', error)
      alert(
        `Could not save: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    } finally {
      setSaving(false)
    }
  }
  async function loadApiComponents() {
    await loadBackendPaths()
  }
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">E</div>
          <div>
            <strong>Edrevel AI</strong>
            <span>Learning Path Builder</span>
          </div>
        </div>
        <div className="header-actions">
          <span className="status-pill">● {status}</span>
          <button onClick={loadLocally}>Load locally</button>
          <button onClick={saveLocally}>Save locally</button>
          <button onClick={loadBackendPaths} disabled={loadingPaths}>
            {loadingPaths ? 'Loading paths...' : 'Load backend paths'}
          </button>
          <button
            className="primary"
            onClick={saveToBackend}
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : backendPathId === null
                ? 'Save to backend'
                : 'Update backend path'}
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <section className="panel-section">
            <h3>CONTENT LIBRARY</h3>
            <p className="muted">Your learning resources</p>
            <button className="wide-button" onClick={() => addNode('unit')}>
              + Add learning unit
            </button>
            <button
              className="wide-button"
              onClick={() => addNode('assessment')}
            >
              + Add assessment
            </button>
          </section>
          <section className="panel-section">
            <h3>BUILDING BLOCKS</h3>
            <button className="block-button" onClick={() => addNode('unit')}>
              <span className="block-icon blue">▤</span>
              <span>
                <strong>Learning Unit</strong>
                <small>Content, lesson or topic</small>
              </span>
              <b>+</b>
            </button>
            <button
              className="block-button"
              onClick={() => addNode('assessment')}
            >
              <span className="block-icon green">✓</span>
              <span>
                <strong>Assessment</strong>
                <small>Quiz or knowledge check</small>
              </span>
              <b>+</b>
            </button>
          </section>
          <section className="panel-section">
            <h3>BACKEND LEARNING PATHS</h3>
            <p className="muted">
              Load a saved path to edit it and save changes to the backend.
            </p>
            <button
              className="wide-button"
              onClick={loadBackendPaths}
              disabled={loadingPaths}
            >
              {loadingPaths ? 'Loading...' : '↻ Refresh saved paths'}
            </button>
            <label htmlFor="saved-path-select">Saved path</label>
            <select
              id="saved-path-select"
              value={selectedBackendPathId}
              onChange={(event) => setSelectedBackendPathId(event.target.value)}
            >
              <option value="">Choose a learning path...</option>
              {savedPaths.map((path, index) => {
                const id = getPathId(path)
                if (id === undefined) return null
                return (
                  <option key={id} value={String(id)}>
                    {path.name || `Learning path ${index + 1}`} (ID: {id})
                  </option>
                )
              })}
            </select>
            <button
              className="wide-button"
              onClick={loadSelectedBackendPath}
              disabled={!selectedBackendPathId}
            >
              Load selected path to edit
            </button>
            <button className="wide-button" onClick={loadApiComponents}>
              Check backend connection
            </button>
          </section>
        </aside>
        <section className="main-content">
          <section className="ai-card">
            <div className="ai-title">✦ AI Path Assistant</div>
            <h2>Describe the learning path you want to create.</h2>
            <div className="ai-controls">
              <textarea
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.target.value)
                  setStatus('Draft')
                }}
                aria-label="Learning path description"
                placeholder="Describe your learning path..."
              />
              <button onClick={generateSample} disabled={generating}>
  {generating ? 'Generating...' : '✦ Generate sample path'}
</button>
            </div>
            <p className="muted">
              Demo feature — sample generation does not use a live AI model.
            </p>
          </section>
          <section className="canvas-section">
            <div className="canvas-heading">
              <div>
                <h1>Learning Path</h1>
                <p>Design and connect your learning journey.</p>
              </div>
              <div className="canvas-actions">
                <button onClick={() => setStatus('Select nodes to connect')}>
                  ↗ Connect nodes
                </button>
                <button onClick={validatePath}>✓ Validate path</button>
                <button onClick={() => setPreviewMode(true)}>
  Preview path
</button>
                <button onClick={deleteSelected}>Delete selected</button>
              </div>
            </div>
            {validationErrors.length > 0 && (
              <div role="alert" className="validation-errors" style={{ margin: "12px 0", padding: "12px 16px", border: "1px solid #ef4444", borderRadius: "8px", background: "#fef2f2", color: "#991b1b" }}>
                <strong>Please fix these validation issues:</strong>
                <ul>
                  {validationErrors.map((error, index) => (
                    <li key={`${index}-${error}`}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {validationPassed && (
              <div role="status" className="validation-success" style={{ margin: "12px 0", padding: "12px 16px", border: "1px solid #16a34a", borderRadius: "8px", background: "#f0fdf4", color: "#166534" }}>
                ✓ Learning path is valid. All blocks have a title and description.
              </div>
            )}
            <div className="canvas">
              <div className="node-list">
                {nodes.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">＋</div>
                    <h2>Start building your learning path</h2>
                    <p>Add a learning unit or assessment to get started.</p>
                  </div>
                ) : (
                  nodes.map((node, index) => (
                    <div className="node-wrapper" key={node.id}>
                      {index > 0 && <div className="node-connector" />}
                      <button
                        className={`node-card ${node.type} ${
                          selectedId === node.id ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedId(node.id)}
                      >
                        <span className="node-type">
                          {node.type === 'unit' ? 'LEARNING UNIT' : 'ASSESSMENT'}
                        </span>
                        <strong>{node.title}</strong>
                        <span className="node-description">
                          {node.description}
                        </span>
                        <span className="node-number">{index + 1}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </section>
        <aside className="properties-panel">
          <h3>PROPERTIES</h3>
          {selectedNode ? (
            <>
              <span className="selected-label">
                {selectedNode.type === 'unit' ? 'LEARNING UNIT' : 'ASSESSMENT'}
              </span>
              <label htmlFor="node-title">Title</label>
              <input
                id="node-title"
                value={selectedNode.title}
                onChange={(event) => updateSelected('title', event.target.value)}
              />
              <label htmlFor="node-description">Description</label>
              <textarea
                id="node-description"
                value={selectedNode.description}
                onChange={(event) =>
                  updateSelected('description', event.target.value)
                }
              />
              {selectedNode.type === 'assessment' && (
                <section style={{ marginTop: 20, borderTop: '1px solid #dbe7f3', paddingTop: 16 }}>
                  <h4 style={{ margin: '0 0 12px' }}>Assessment questions</h4>
                  {(selectedNode.questions ?? []).map((question, questionIndex) => (
                    <div key={question.id} style={{ border: '1px solid #dbe7f3', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <strong>Question {questionIndex + 1}</strong>
                        <button type="button" onClick={() => deleteQuestion(question.id)} disabled={(selectedNode.questions ?? []).length <= 1} style={{ color: '#b91c1c' }}>Remove</button>
                      </div>
                      <label htmlFor={`question-${question.id}`}>Question text</label>
                      <textarea
                        id={`question-${question.id}`}
                        value={question.question}
                        placeholder="Enter your question"
                        onChange={(event) => updateQuestion(question.id, { question: event.target.value })}
                        style={{ minHeight: 75, width: '100%', boxSizing: 'border-box' }}
                      />
                      <p style={{ margin: '12px 0 6px', fontWeight: 600 }}>Answer options (select the correct answer)</p>
                      {question.options.map((option, optionIndex) => (
                        <label key={optionIndex} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
                          <input
                            type="radio"
                            name={`correct-${selectedNode.id}-${question.id}`}
                            checked={question.correctAnswer === optionIndex}
                            onChange={() => updateQuestion(question.id, { correctAnswer: optionIndex })}
                            aria-label={`Mark option ${optionIndex + 1} as correct`}
                          />
                          <input
                            value={option}
                            placeholder={`Option ${optionIndex + 1}`}
                            onChange={(event) => updateQuestionOption(question.id, optionIndex, event.target.value)}
                            style={{ minWidth: 0, flex: 1 }}
                          />
                        </label>
                      ))}
                    </div>
                  ))}
                  <button type="button" className="wide-button" onClick={addQuestion}>+ Add question</button>
                  <p className="muted" style={{ fontSize: 12 }}>Questions and answer options are saved with the learning path.</p>
                </section>
              )}
              <button
                className="wide-button danger"
                onClick={deleteSelected}
              >
                Delete this block
              </button>
            </>
          ) : (
            <p className="muted">Select a learning block to edit its details.</p>
          )}
          <div className="properties-help">
            <h4>Quick tip</h4>
            <p>
              Select any block on the canvas to edit its title and description.
              Load a saved backend path first if you want to update an existing
              record.
            </p>
          </div>
        </aside>
      </div>
      {previewMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="learning-preview-title"
          className="preview-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            overflowY: 'auto',
            background: '#f4f8fc',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '900px',
              margin: '0 auto',
              background: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 12px 40px rgba(15, 23, 42, 0.16)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '24px',
              }}
            >
              <div style={{ marginBottom: 28 }}>
  <p style={{
    color: '#0878f9',
    fontWeight: 700,
    margin: '0 0 8px'
  }}>
    LEARNER PREVIEW
  </p>

  <h1 style={{
    fontSize: 42,
    lineHeight: 1.2,
    margin: '0 0 8px'
  }}>
    Edrevel Learning Path
  </h1>

  <p style={{
    margin: 0,
    color: '#64748b',
    lineHeight: 1.5
  }}>
    {prompt}
  
  </p>
</div>
<button onClick={() => setPreviewMode(false)}>
  ← Back to editor
</button>
</div>
{nodes.length === 0 ? (
              <div
                style={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                No learning blocks yet. Return to the editor and add a learning unit or assessment.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {nodes.map((node, index) => (
                  <article
                    key={node.id}
                    style={{
                      border: '1px solid #dbe7f3',
                      borderLeft: `5px solid ${node.type === 'assessment' ? '#10b981' : '#1683ed'}`,
                      borderRadius: '12px',
                      padding: '20px',
                      background: '#ffffff',
                    }}
                  >
                    <p
                      style={{
                        color: node.type === 'assessment' ? '#047857' : '#0878e8',
                        fontWeight: 700,
                        fontSize: '12px',
                        letterSpacing: '0.06em',
                        margin: '0 0 10px',
                      }}
                    >
                      {`STEP ${index + 1} · ${node.type === 'unit' ? 'LEARNING UNIT' : 'ASSESSMENT'}`}
                    </p>
                    <h2 style={{ margin: '0 0 10px', fontSize: '22px' }}>
                      {node.title}
                    </h2>
                    <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
                      {node.description}
                    </p>
                    {node.type === 'assessment' && (node.questions ?? []).map((question, questionIndex) => (
                      <div key={question.id} style={{ marginTop: 18, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                        <strong>{`Q${questionIndex + 1}. ${question.question || 'Untitled question'}`}</strong>
                        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                          {question.options.map((option, optionIndex) => {
                            const answerKey = `${node.id}-${question.id}`
                            const isChosen = quizAnswers[answerKey] === optionIndex
                            const isCorrect = question.correctAnswer === optionIndex
                            return (
                              <label
                                key={optionIndex}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '10px 12px', border: '1px solid #dbe7f3',
                                  borderRadius: 8, cursor: quizSubmitted ? 'default' : 'pointer',
                                  background: quizSubmitted && isCorrect ? '#ecfdf5' : isChosen ? '#eff6ff' : '#fff',
                                  borderColor: quizSubmitted && isCorrect ? '#10b981' : isChosen ? '#1683ed' : '#dbe7f3',
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`preview-${node.id}-${question.id}`}
                                  checked={isChosen}
                                  disabled={quizSubmitted}
                                  onChange={() => setQuizAnswer(node.id, question.id, optionIndex)}
                                />
                                <span>{option || `Option ${optionIndex + 1}`}</span>
                                {quizSubmitted && isCorrect && <strong style={{ marginLeft: 'auto', color: '#047857' }}>Correct answer</strong>}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </article>
                ))}
              </div>
            )}
            {quizQuestions.length > 0 && (
              <section style={{ marginTop: 24, padding: 20, borderRadius: 12, background: '#f8fafc', border: '1px solid #dbe7f3' }}>
                {!quizSubmitted ? (
                  <>
                    <p style={{ marginTop: 0, color: '#475569' }}>
                      Answer all {quizQuestions.length} question(s), then submit to see your score.
                    </p>
                    <button
                      className="primary"
                      onClick={submitQuiz}
                      disabled={aiLoading}
                    >
                      Submit quiz
                    </button>
                  </>
                ) : (
                  <div role="status" aria-live="polite">
                    <h2 style={{ marginTop: 0 }}>Quiz results</h2>
                    <p style={{ fontSize: 20, fontWeight: 700, color: '#0878e8' }}>
                      Score: {quizScore} / {quizQuestions.length} ({Math.round((quizScore / quizQuestions.length) * 100)}%)
                    </p>
                    <p>{quizScore === quizQuestions.length ? 'Excellent! You answered every question correctly.' : 'Review the highlighted correct answers and try again.'}</p>
                    
<div
  style={{
    marginTop: 16,
    padding: 16,
    borderRadius: 10,
    background:
      quizQuestions.length > 0 &&
      (quizScore / quizQuestions.length) * 100 < 50
        ? '#fff7ed'
        : '#ecfdf5',
    border: '1px solid #dbe7f3',
  }}
>
  <h3>Adaptive Learning Recommendation</h3>

  {(quizScore / quizQuestions.length) * 100 < 50 ? (
    <>
      <strong>Recommended path: Easy</strong>
      <p>
        Your score is below 50%. Review the Introduction and Core Concepts,
        then try the assessment again.
      </p>
    </>
  ) : (
    <>
      <strong>Recommended path: Advanced</strong>
      <p>
        Your score is 50% or higher. Continue to advanced concepts and
        practical exercises.
      </p>
    </>
  )}
</div>

                    <section
                      aria-live="polite"
                      style={{ marginTop: 20, padding: 18, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a' }}
                    >
                      <h3 style={{ margin: '0 0 10px' }}>✦ AI Learning Recommendation</h3>
                      {aiLoading && (
  <p style={{ margin: 0 }}>
    Personalized recommendation is temporarily unavailable.
    Please follow the adaptive learning recommendation above.
  </p>
)}
                      {!aiLoading && aiError && (
                        <p role="alert" style={{ margin: 0, color: '#b91c1c' }}>
                          {aiError} Your quiz score is saved on this screen.
                        </p>
                      )}
                      {!aiLoading && !aiError && aiRecommendation && (
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{aiRecommendation}</p>
                      )}
                    </section>
                    <button onClick={openLearnerPreview} style={{ marginTop: 12 }}>Try again</button>
                  </div>
                )}
              </section>
            )}
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button onClick={() => setPreviewMode(false)}>
                Return to editing
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
export default App
