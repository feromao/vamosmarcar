'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { format, isBefore, startOfToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { TimeIcon } from './time-icon'
import { LocationSelection } from './location-selection'
import { SelectedDatesDrawer } from './selected-dates-drawer'
import TimeRangeModal from './time-range-modal'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { db } from '@/lib/firebase'
import { collection, addDoc } from 'firebase/firestore'

const steps = ['Quando?', 'Hora?', 'Onde?', 'Finalizar']

const timeOptions = [
  { id: 'manha', label: 'Manhã', icon: 'morning' },
  { id: 'tarde', label: 'Tarde', icon: 'afternoon' },
  { id: 'noite', label: 'Noite', icon: 'night' },
  { id: 'madrugada', label: 'Madrugada', icon: 'latenight' },
  { id: 'dia-todo', label: 'Dia todo', icon: 'allday' },
  { id: 'hora-especifica', label: 'Hora específica', icon: 'clock' },
]

interface DateSelection {
  date: Date
  time?: string
}

export default function EventStepsPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const [selectedDates, setSelectedDates] = useState<DateSelection[]>([])
  const [selectedLocation, setSelectedLocation] = useState<{
    type: string
    details?: string
    address?: string
  } | null>(null)
  const [currentDateIndex, setCurrentDateIndex] = useState(0)
  const [isTimeRangeModalOpen, setIsTimeRangeModalOpen] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ start: string; end: string } | null>(null)
  const [showDateWarning, setShowDateWarning] = useState(false)
  const [finalForm, setFinalForm] = useState({
    votingDuration: '5 dias',
    name: '',
    email: '',
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [eventCode, setEventCode] = useState('')
  const [eventLink, setEventLink] = useState('')

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) return;

    setSelectedDates(prevDates => {
      const newDates = dates.map(date => ({
        date,
        time: prevDates.find(d => d.date.getTime() === date.getTime())?.time
      }));

      return newDates.slice(0, 8);
    });
  }

  const formatDate = (date: Date) => {
    return format(date, "d/MMM", { locale: ptBR }).toLowerCase()
  }

  const removeDate = (dateToRemove: Date) => {
    setSelectedDates(prev => prev.filter(
      d => d.date.getTime() !== dateToRemove.getTime()
    ))
  }

  const handleTimeSelect = (dateStr: string, time: string) => {
    setSelectedDates(prev => {
      if (dateStr === 'all') {
        return prev.map(d => ({ ...d, time }))
      }
      return prev.map(d =>
        d.date.toISOString() === dateStr ? { ...d, time } : d
      )
    })
  }

  const handleNext = async () => {
    if (currentStep === 0 && selectedDates.length < 2) {
      setShowDateWarning(true)
      return
    }
    if (currentStep === 1) {
      setSelectedDates(prev => prev.map(d => ({
        ...d,
        time: d.time || 'Dia todo'
      })))
    }
    if (currentStep === steps.length - 2) {
      try {
        const eventRef = await addDoc(collection(db, 'events'), {
          dates: selectedDates.map(d => ({ date: d.date.toISOString(), time: d.time })),
          location: selectedLocation,
          votingDuration: finalForm.votingDuration,
          creatorName: finalForm.name,
          creatorEmail: finalForm.email,
          createdAt: new Date().toISOString()
        });
        const code = eventRef.id.slice(0, 6).toUpperCase();
        setEventCode(code);
        setEventLink(`https://vamosmarcar.com/votar/${code}`);
        setShowSuccess(true);
      } catch (error) {
        console.error("Error adding document: ", error);
        // Aqui você pode adicionar uma notificação de erro para o usuário
      }
    }
    if (currentStep < steps.length - 1) {
      setDirection(1)
      setCurrentStep(prev => prev + 1)
      setShowDateWarning(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1)
      setCurrentStep(prev => prev - 1)
    }
  }

  const handlePrevDate = () => {
    setCurrentDateIndex(prev => (prev > 0 ? prev - 1 : selectedDates.length - 1))
  }

  const handleNextDate = () => {
    setCurrentDateIndex(prev => (prev < selectedDates.length - 1 ? prev + 1 : 0))
  }

  const handleTimeRangeSelect = (start: string, end: string) => {
    setSelectedTimeRange({ start, end })
    setIsTimeRangeModalOpen(false)
    if (selectedDates[currentDateIndex]) {
      handleTimeSelect(selectedDates[currentDateIndex].date.toISOString(), `${start} - ${end}`)
    }
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0
    })
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">
                Quais são os possíveis dias que o rolê deve acontecer?
              </h2>
              <p className="text-gray-600">
                Selecione até 8 datas para que seus amigos votem
              </p>
            </div>
            <div className="flex justify-center">
              <Calendar
                mode="multiple"
                selected={selectedDates.map(d => d.date)}
                onSelect={handleDateSelect}
                className="rounded-md border-2 border-black"
                locale={ptBR}
                disabled={(date) =>
                  date < startOfToday() ||
                  (selectedDates.length >= 8 && !selectedDates.some(d => d.date.getTime() === date.getTime()))
                }
                fromDate={startOfToday()}
              />
            </div>
          </div>
        )
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">
                Sabe em qual momento do dia vai acontecer o rolê?
              </h2>
              <p className="text-gray-600">
                Você pode selecionar opções diferentes para cada data, isso pode ajudar seus convidados a decidirem
              </p>
            </div>
            <Tabs defaultValue="all" className="w-full">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevDate}
                  disabled={currentDateIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <TabsList className="flex justify-start overflow-x-auto gap-2 bg-transparent p-1">
                  <TabsTrigger
                    value="all"
                    className="flex-shrink-0 border-2 border-black data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white"
                  >
                    Todas as datas
                  </TabsTrigger>
                  {selectedDates.map(({ date }, index) => (
                    <TabsTrigger
                      key={date.toISOString()}
                      value={date.toISOString()}
                      className={`flex-shrink-0 border-2 border-black data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white ${
                        index === currentDateIndex ? 'ring-2 ring-[#FF6B6B]' : ''
                      }`}
                      onClick={() => setCurrentDateIndex(index)}
                    >
                      {formatDate(date)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextDate}
                  disabled={currentDateIndex === selectedDates.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <TabsContent value="all" className="mt-6">
                <div className="grid grid-cols-3 gap-4">
                  {timeOptions.map((option) => (
                    <TimeIcon
                      key={option.id}
                      type={option.icon}
                      label={option.label}
                      selected={selectedDates.every(d => d.time === option.label)}
                      onClick={() => {
                        if (option.id === 'hora-especifica') {
                          setIsTimeRangeModalOpen(true)
                        } else {
                          handleTimeSelect('all', option.label)
                        }
                      }}
                    />
                  ))}
                </div>
              </TabsContent>
              {selectedDates.map(({ date }) => (
                <TabsContent key={date.toISOString()} value={date.toISOString()} className="mt-6">
                  <div className="grid grid-cols-3 gap-4">
                    {timeOptions.map((option) => (
                      <TimeIcon
                        key={option.id}
                        type={option.icon}
                        label={option.label}
                        selected={selectedDates.find(
                          d => d.date.toISOString() === date.toISOString()
                        )?.time === option.label}
                        onClick={() => {
                          if (option.id === 'hora-especifica') {
                            setIsTimeRangeModalOpen(true)
                          } else {
                            handleTimeSelect(date.toISOString(), option.label)
                          }
                        }}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )
      case 2:
        return (
          <LocationSelection
            onLocationSelect={(location) => setSelectedLocation(location)}
          />
        )
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">Última etapa</h2>
              <p className="text-gray-600">
                Confira as informações abaixo e coloque seu e-mail para finalizar
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="votingDuration">A votação acaba em</Label>
                <Select
                  value={finalForm.votingDuration}
                  onValueChange={(value) => setFinalForm(prev => ({ ...prev, votingDuration: value }))}
                >
                  <SelectTrigger id="votingDuration">
                    <SelectValue placeholder="Selecione a duração" />
                  </SelectTrigger>
                  <SelectContent>
                    {['3 dias', '5 dias', '7 dias', '10 dias', '15 dias'].map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={finalForm.name}
                  onChange={(e) => setFinalForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={finalForm.email}
                  onChange={(e) => setFinalForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Seu e-mail"
                />
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#FFD700] p-4 flex flex-col items-center justify-center">
        <Card className="w-full max-w-lg border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
          <div className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Compartilhe o link!</h2>
              <p className="text-gray-600">
                Legal, agora é só enviar o link abaixo ou compartilhar o código {eventCode} da votação e aguardar o resultado
              </p>
            </div>
            <div className="space-y-4">
              <div className="p-2 bg-gray-100 rounded-md">
                <p className="text-center font-medium break-all">{eventLink}</p>
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={() => navigator.clipboard.writeText(eventLink)}
                  className="bg-[#FF6B6B] hover:bg-[#FF5252] text-white"
                >
                  Copiar Link
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFD700] p-4 flex flex-col items-center justify-center">
      <Card className="w-full max-w-lg border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
        <div className="p-6">
          <div className="flex justify-between mb-6">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`flex items-center ${
                  index <= currentStep ? 'text-[#FF6B6B]' : 'text-gray-400'
                }`}
              >
                <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center mr-2">
                  {index + 1}
                </div>
                <span>{step}</span>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-2" />
                )}
              </div>
            ))}
          </div>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>

      <SelectedDatesDrawer
        selections={selectedDates}
        onRemove={removeDate}
      />

      <div className="flex justify-between w-full max-w-lg mt-4">
        <Button
          onClick={handleBack}
          variant="outline"
          className="bg-white hover:bg-gray-50 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          Voltar
        </Button>
        <Popover open={showDateWarning && selectedDates.length < 2} onOpenChange={setShowDateWarning}>
          <PopoverTrigger asChild>
            <Button
              onClick={handleNext}
              className="bg-[#FF6B6B] hover:bg-[#FF5252] text-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              {currentStep === steps.length - 1 ? 'Finalizar' : 'Próximo'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto">
            Selecione pelo menos 2 datas
          </PopoverContent>
        </Popover>
      </div>
      <TimeRangeModal
        isOpen={isTimeRangeModalOpen}
        onClose={() => setIsTimeRangeModalOpen(false)}
        onSave={handleTimeRangeSelect}
      />
    </div>
  )
}

