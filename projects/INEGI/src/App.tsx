import './App.css'

function App() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#ACCCD8]">
      <button className="mb-8 px-10 py-6 text-2xl font-bold bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition">
        Botón Superior
      </button>
      <div className="flex flex-col items-center mb-8">
        <label htmlFor="casos" className="mb-2 text-lg font-medium text-gray-700">
          ¿Cuántos casos prácticos?
        </label>
        <select
          id="casos"
          className="px-4 py-2 rounded border border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </div>
      <div className="flex gap-6">
        <button className="px-8 py-4 text-lg font-semibold bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition">
          Botón Inferior 1
        </button>
        <button className="px-8 py-4 text-lg font-semibold bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition">
          Botón Inferior 2
        </button>
      </div>
    </div>
  )
}

export default App
