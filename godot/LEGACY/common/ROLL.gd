class_name ROLL
extends Node

func under(value):
	return 1

func Xd6(dice:int, mod:int, per_die:int):
	return dice + mod + dice*per_die
