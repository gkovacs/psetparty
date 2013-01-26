#!/usr/bin/env python

buildingnum_to_address = {}

output = {}

for line in open('buildings-orig.txt'):
  buildingnum = line[0:11].strip()
  buildingname = line[11:46].strip()
  buildingaddress = line[46:79].strip()
  buildingnum_to_address[buildingnum] = buildingaddress
  output['BUILDING ' + buildingnum] = buildingaddress
  output[buildingname] = buildingaddress

classrooms = []
for line in open('classrooms.txt'):
  for classroom in line.split('|'):
    classrooms.append(classroom.strip())

for classroom in classrooms:
  buildingnum = classroom.split('-')[0]
  address = buildingnum_to_address[buildingnum]
  output[classroom] =  address

for k,v in sorted(output.items()):
  print k + '\t' + v
